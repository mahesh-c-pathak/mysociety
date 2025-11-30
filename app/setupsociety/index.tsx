import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  StatusBar,
  RefreshControl,
} from "react-native";
import { db } from "@/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthRole } from "@/lib/authRole";
import { Appbar, Badge } from "react-native-paper";
import { useNavigation, DrawerActions } from "@react-navigation/native";

type SocietyDetails = {
  memberRole?: string[];
  myWing?: {
    [wing: string]: {
      floorData?: {
        [floor: string]: {
          [flatNumber: string]: {
            userType?: string;
            userStatus?: string;
          };
        };
      };
    };
  };
};

type SocietyObj = {
  [societyName: string]: SocietyDetails;
};

const MyPropertiesScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Dynamically hide the header for this screen
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [cards, setCards] = useState<any[]>([]);
  const { width } = useWindowDimensions(); // Get screen width
  const cardWidth = width * 0.44; // Calculate card width (44% of screen width for spacing)
  const router = useRouter();

  const { user } = useAuthRole();

  const userId = user?.uid ?? null; // ✅ Safely handle null user
  const [unreadCount, setUnreadCount] = useState(0);

  const [societies, setSocieties] = useState<string[]>([]);

  const [refreshing, setRefreshing] = useState(false);

  // Fetch user's society names

  const fetchSocietiesForUser = useCallback(async () => {
    if (!userId) return;
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const mySociety = userData.mySociety || [];
      const names = mySociety.map((entry: any) => Object.keys(entry)[0]);
      setSocieties(names);
    } else {
      setSocieties([]);
    }
  }, [userId]);

  // ✅ Fetch societies inside useEffect
  useEffect(() => {
    fetchSocietiesForUser();
  }, [fetchSocietiesForUser]);

  // ✅ Fetch unread messages count for all societies

  const fetchUnreadMessages = useCallback(async () => {
    if (!userId || societies.length === 0) return;
    if (societies.length === 0) return; // avoid empty fetch

    try {
      let totalUnread = 0;

      // Loop through all societies of the user
      for (const societyName of societies) {
        const messagesRef = collection(
          db,
          "Societies",
          societyName,
          "InAppMessages"
        );

        const q = query(
          messagesRef,
          where("toUserId", "==", userId),
          where("read", "==", false)
        );

        const snapshot = await getDocs(q);
        totalUnread += snapshot.size; // Add unread count for this society
      }

      setUnreadCount(totalUnread);
      console.log("Total unread messages:", totalUnread);
    } catch (error) {
      console.error("Error fetching unread messages:", error);
    }
  }, [userId, societies]);

  useEffect(() => {
    fetchUnreadMessages();
  }, [fetchUnreadMessages]);

  const fetchSocieties = useCallback(async () => {
    if (!user?.uid) return; // Exit early if user is not ready
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const cardList: any[] = [];

        // Check if `mySociety` exists before iterating
        if (userData.mySociety) {
          userData.mySociety.forEach((societyObj: SocietyObj) => {
            const [societyName, societyDetails] = Object.entries(societyObj)[0];

            if (societyDetails.memberRole?.includes("Admin")) {
              cardList.push({
                id: `${societyName}-admin`,
                societyName,
                role: "Admin",
                flatDetails: null,
              });
            }

            if (societyDetails.memberRole?.includes("GateKeeper")) {
              cardList.push({
                id: `${societyName}-gatekeeper`,
                societyName,
                role: "GateKeeper",
                flatDetails: null,
              });
            }

            if (societyDetails.myWing) {
              Object.entries(societyDetails.myWing).forEach(
                ([wing, wingData]) => {
                  if (wingData.floorData) {
                    Object.entries(wingData.floorData).forEach(
                      ([floorName, flats]: [string, any]) => {
                        Object.entries(flats).forEach(
                          ([flatNumber, flatDetails]: [string, any]) => {
                            cardList.push({
                              id: `${societyName}-${flatNumber}`,
                              societyName,
                              role: `${wing} ${flatNumber} ${
                                flatDetails.userType || "Owner"
                              }`,
                              flatDetails,
                              wing,
                              floorName,
                            });
                          }
                        );
                      }
                    );
                  }
                }
              );
            }
          });
        }

        setCards(cardList); // Update cards state
      } else {
        console.error("User document does not exist.");
      }
    } catch (error) {
      console.error("Error fetching society data:", error);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      fetchSocieties();
    }, [fetchSocieties])
  );

  // ✅ Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchSocietiesForUser(),
      fetchUnreadMessages(),
      fetchSocieties(),
    ]);
    setRefreshing(false);
  }, [fetchSocietiesForUser, fetchUnreadMessages, fetchSocieties]);

  const handlePress = (item: any) => {
    if (item.role === "Admin") {
      router.push(
        `/admin?role=${item.role}&societyName=${item.societyName}` // modify
      );
    } else if (item.flatDetails) {
      const userStatus = item.flatDetails.userStatus;

      if (userStatus === "Pending Approval") {
        alert("Please tell your administrator to activate your account");
        return; // Prevent further execution
      } else if (userStatus === "Denied Approval") {
        alert("Apartment Profile not found");
        return; // Prevent further execution
      } else if (userStatus === "Approved") {
        router.push(
          `/member?societyName=${item.societyName}&wing=${
            item.wing
          }&floorName=${item.floorName}&flatNumber=${
            item.id.split("-")[1]
          }&userType=${item.flatDetails.userType || "Owner"}`
        );
      }
    } else if (item.role === "GateKeeper") {
      router.push(
        `/GateKeeper?role=${item.role}&societyName=${item.societyName}`
      );
    }
  };

  const renderCard = ({ item }: { item: any }) => {
    const backgroundColor =
      item.role === "Admin" ||
      item.role === "GateKeeper" ||
      item.flatDetails?.userStatus === "Approved"
        ? "#fff"
        : "#DDDDDD";

    return (
      <TouchableOpacity
        onPress={() => handlePress(item)}
        style={[styles.card, { width: cardWidth, backgroundColor }]} // Dynamically set card background color
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🏢</Text>
        </View>
        <Text style={styles.cardTitle}>{item.societyName}</Text>
        <View
          style={[
            styles.roleContainer,
            item.role === "Admin"
              ? styles.adminBackground
              : item.role === "GateKeeper"
                ? styles.gateKeeperBackground
                : styles.ownerBackground,
            { width: cardWidth },
          ]}
        >
          <Text style={styles.roleText}>{item.role}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2196F3" barStyle="light-content" />
      <Appbar.Header style={styles.header}>
        {/* Hamburger Menu Icon */}
        <Appbar.Action
          icon="menu"
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          color="#fff"
        />
        {/* Centered Title */}
        <Appbar.Content
          title="My Properties"
          titleStyle={styles.titleStyle}
          style={styles.centerTitle}
        />
        {/* Notification Bell with Badge */}
        <View style={styles.notificationContainer}>
          <Appbar.Action
            icon="bell"
            onPress={() => {
              router.push({
                pathname: "/setupsociety/inappmessages",
                params: { userId, societies: JSON.stringify(societies) },
              });
            }}
            color="#fff"
          />
          {unreadCount > 0 && <Badge style={styles.badge}>{unreadCount}</Badge>}
        </View>
      </Appbar.Header>

      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{user?.email ?? "Guest User"}</Text>
      </View>
      {/* Logout Button 
      <Button mode="contained" onPress={handleFirebaseLogout}>
        Logout
      </Button>
      */}

      {/* ✅ Add RefreshControl to FlatList */}

      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.cardList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2196F3"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No societies found. Click on Connect Button to join.
            </Text>
          </View>
        }
        numColumns={2} // Display 2 cards per row
        ListFooterComponent={
          <TouchableOpacity
            style={[styles.connectCard, { width: cardWidth * 2 + 16 }]}
            onPress={() => {
              router.push({
                pathname: "/setupsociety/JoinApp",
              });
            }}
          >
            <Text style={styles.connectIcon}>🏢</Text>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.connectTitle}>Connect</Text>
              <Text style={styles.connectSubtitle}>
                Create or Join your housing societies/apartment/commercial
                buildings.
              </Text>
            </View>
          </TouchableOpacity>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "FFFFFF",
  },
  cardList: {
    paddingHorizontal: 8,
    paddingVertical: 16,
    justifyContent: "space-between",
    paddingBottom: 100,
  },
  card: {
    alignItems: "center",
    padding: 16,
    margin: 8,
    backgroundColor: "#fff",
    borderRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: 30,
    marginBottom: 8,
  },
  icon: {
    fontSize: 32,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
  },
  roleContainer: {
    position: "absolute",
    bottom: 0,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  roleText: {
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
  },
  adminBackground: {
    backgroundColor: "#6200ea",
  },
  ownerBackground: {
    backgroundColor: "#52a0dc",
  },
  gateKeeperBackground: {
    backgroundColor: "#000", // Black background for Gate Keeper
  },
  connectCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
    alignSelf: "center",
  },
  connectIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  connectTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  connectSubtitle: {
    fontSize: 14,
    color: "#555",
    flexWrap: "wrap",
  },
  header: {
    // Match background color from the attached image
    elevation: 4,
    backgroundColor: "#2196F3",
  },
  titleStyle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  centerTitle: {
    alignItems: "center", // Center-align title
  },
  notificationContainer: {
    position: "relative", // To position the badge over the bell
  },
  badge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#ff1744", // Badge background color
    color: "#fff", // Badge text color
    fontSize: 12,
    height: 16,
    minWidth: 16,
    borderRadius: 8,
    textAlign: "center",
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
  },
});

export default MyPropertiesScreen;
