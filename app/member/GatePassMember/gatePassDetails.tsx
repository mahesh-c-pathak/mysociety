import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Linking,
} from "react-native";
import React, { useState, useEffect } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import AppbarMenuComponent from "@/components/AppbarMenuComponent";
import { Stack, useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { useSociety } from "@/utils/SocietyContext";
import { FontAwesome } from "@expo/vector-icons"; // Import Expo icons
import { Divider } from "react-native-paper";
import { collection, getDocs, doc, query, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";

const GatePassDetails = () => {
  const { societyName } = useSociety();
  const { item } = useLocalSearchParams();
  // Parse the passed item
  const profileItem = item ? JSON.parse(item as string) : {};
  const docId = profileItem.id;
  const wing = profileItem.wing;
  const floorName = profileItem.floorName;
  const flatNumber = profileItem.flatNumber;

  const hasuniqueId = profileItem.uniqueId;
  const [loading, setLoading] = useState(false);

  // const customStaffCollectionName = `staff_${societyName}`;
  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;

  // const customVisitorCollectionName = `visitor_${societyName}`;

  const customVisitorCollectionName = "visitor";

  const [gatePassCheckInData, setGatePassCheckInData] = useState<any[]>([]);

  useEffect(() => {
    const fetchVisitorCheckInData = async () => {
      setLoading(true);
      try {
        // Construct Firestore references
        const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
        const flatDocRef = doc(db, flatRef);

        // Reference to the visitors collection
        const visitorCollectionRef = collection(
          flatDocRef,
          customVisitorCollectionName
        );

        // Firestore query to filter by uniqueId
        const q = query(
          visitorCollectionRef,
          where("societyName", "==", societyName),
          where("uniqueId", "==", profileItem.uniqueId)
        );
        // Execute query
        const querySnapshot = await getDocs(q);

        // Extract and store visitor data
        const visits = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setGatePassCheckInData(visits);
      } catch (error) {
        console.error("Error fetching Visitors Checked In data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVisitorCheckInData();
  }, [
    customFlatsSubcollectionName,
    customFloorsSubcollectionName,
    customVisitorCollectionName,
    customWingsSubcollectionName,
    flatNumber,
    floorName,
    hasuniqueId,
    profileItem.uniqueId,
    societyName,
    wing,
  ]);

  const renderVisitsData = ({ item }: { item: any }) => {
    const hasImage =
      item.selectedImageUrl && item.selectedImageUrl.trim() !== "";
    const initials = item.name ? item.name.charAt(0).toUpperCase() : "?";

    return (
      <View style={styles.cardview}>
        <TouchableOpacity>
          <View style={styles.rowedy}>
            <View style={styles.profileContainer}>
              {hasImage ? (
                <Image
                  source={{ uri: item.selectedImageUrl }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.initialsContainer}>
                  <Text style={styles.initialsText}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
              <Text style={{ marginBottom: 2 }}>{item.mobileNumber}</Text>
              <Text style={{ marginBottom: 4, color: "green" }}>
                In Time: {item.formattedDateTime}
              </Text>
              <Text style={{ marginBottom: 4, color: "red" }}>
                Out Time: {item.formatteCheckOutdDateTime}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const hasImage =
    profileItem.selectedImageUrl && profileItem.selectedImageUrl.trim() !== "";
  const initials = profileItem.name
    ? profileItem.name.charAt(0).toUpperCase()
    : "?";

  const [menuVisible, setMenuVisible] = useState(false);
  const handleMenuOptionPress = async (option: string) => {
    if (option === "Delete") {
    }

    setMenuVisible(false);
  };
  const closeMenu = () => {
    setMenuVisible(false);
  };

  const makeCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch((err) =>
      console.error("Error opening dialer:", err)
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppbarComponent
        title={`Gate Pass No. - ${docId || ""}`}
        onPressThreeDot={() => setMenuVisible(!menuVisible)}
      />
      {/* Three-dot Menu */}
      {menuVisible && (
        <AppbarMenuComponent
          items={["Expired"]}
          onItemPress={handleMenuOptionPress}
          closeMenu={closeMenu}
        />
      )}
      <ScrollView>
        <View style={styles.memberProfile}>
          <Text style={styles.memberText}>{profileItem.visitingTo}</Text>
          <Text>{societyName}</Text>
        </View>

        <View style={styles.cardview}>
          <Text style={{ fontWeight: "bold", fontSize: 20 }}>
            Visitor Information
          </Text>
          <View style={styles.rowedy}>
            <View style={styles.profileContainer}>
              {hasImage ? (
                <Image
                  source={{ uri: profileItem.selectedImageUrl }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.initialsContainer}>
                  <Text style={styles.initialsText}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontWeight: "bold", marginBottom: 4, fontSize: 16 }}
              >
                {profileItem.name}
              </Text>
              <Text style={{ marginBottom: 4 }}>
                {profileItem.mobileNumber}
              </Text>
              <Text>{profileItem.address}</Text>
            </View>
            <View>
              {/* Call Button */}
              <TouchableOpacity
                style={styles.buttonWrapper}
                onPress={() => {
                  makeCall(profileItem.mobileNumber);
                }}
              >
                <FontAwesome name="phone" size={24} color="#2196F3" />
              </TouchableOpacity>
            </View>
          </View>
          <Divider style={{ backgroundColor: "#ccc", marginVertical: 8 }} />
          <View style={styles.row}>
            <View style={{ marginLeft: 12 }}>
              <Text>Valid From</Text>
              <Text style={styles.date}>
                {profileItem.validFromDateFormated}
              </Text>
            </View>
            <View style={{ marginRight: 12 }}>
              <Text>Valid To</Text>
              <Text style={styles.date}>{profileItem.validToDateFormated}</Text>
            </View>
          </View>
          <Divider style={{ backgroundColor: "#ccc", marginVertical: 8 }} />

          {docId ? (
            <View style={styles.qrcode}>
              <QRCode value={docId} size={200} />
            </View>
          ) : null}

          <View style={styles.gatepassno}>
            <Text
              style={styles.gatepassnoText}
            >{`Gate Pass No. - ${docId}`}</Text>
          </View>
        </View>
        <View style={styles.cardview}>
          <Text style={{ fontWeight: "bold", fontSize: 20 }}>
            Visited History
          </Text>

          <FlatList
            data={gatePassCheckInData}
            renderItem={renderVisitsData}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyMessage}>No vistor ChekIn Data</Text>
            }
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default GatePassDetails;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  memberProfile: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B6D0E2",
    paddingVertical: 12,
  },
  memberText: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 8,
  },
  qrcode: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
    paddingVertical: 40,
  },
  gatepassno: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#2196F3",
    marginHorizontal: 40,
    marginBottom: 16,
  },
  gatepassnoText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2196F3",
  },
  profileContainer: {
    width: 50,
    height: 50,
    borderRadius: 30, // Makes it circular
    overflow: "hidden", // Ensures the image stays within the circle
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#007AFF", // Default background for initials
  },
  profileImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover", // Ensures the image covers the circle
  },
  initialsContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  rowedy: {
    flexDirection: "row",
    alignItems: "flex-start", // Ensures proper alignment
    gap: 16, // Provides spacing between elements without forcing them apart
    marginVertical: 12,
  },
  buttonWrapper: {
    padding: 10, // Add padding for visibility
    justifyContent: "center",
    alignItems: "center",
  },
  cardview: {
    marginBottom: 16,
    padding: 4,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    elevation: 4, // For shadow on Android
    shadowColor: "#000", // For shadow on iOS
    shadowOffset: { width: 0, height: 2 }, // For shadow on iOS
    shadowOpacity: 0.1, // For shadow on iOS
    shadowRadius: 4, // For shadow on iOS
    borderWidth: 1, // Optional for outline
    borderColor: "#e0e0e0", // Optional for outline
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontWeight: "bold",
    fontSize: 14,
    marginVertical: 4,
  },
  list: {
    padding: 10,
  },
  emptyMessage: {
    textAlign: "center",
    fontSize: 16,
    color: "#888",
    marginVertical: 20,
  },
});
