import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { IconButton, FAB, Avatar } from "react-native-paper";
import { useRouter } from "expo-router";

import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSociety } from "@/utils/SocietyContext";

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

const MembersScreen: React.FC = () => {
  
  const { societyName } = useSociety();
  const insets = useSafeAreaInsets();

  const [selectedButton, setSelectedButton] = useState<string | null>("A");
  const router = useRouter(); // Router for navigation

  const [cards, setCards] = useState<any[]>([]);
  const [wingNames, setWingNames] = useState<string[]>([]); // State to store wing names
  const customWingsSubcollectionName = `${societyName} wings`;


  useEffect(() => {
    const wingNames = async () => {
      try {
        const wingsRef = collection(
          db,
          "Societies",
          societyName,
          customWingsSubcollectionName
        ); // Reference to wings collection
        const wingsSnapshot = await getDocs(wingsRef); // Fetch all documents in wings collection
        if (!wingsSnapshot.empty) {
          const wingList: string[] = [];
          wingsSnapshot.forEach((doc) => {
            wingList.push(doc.id); // Add document ID (wing name) to the array
          });

          setWingNames(wingList); // Update state with wing names
        }
      } catch (error) {
        console.log("error fetching flat data", error);
      }
    };
    wingNames();
  }, []);

  useEffect(() => {
    const fetchSocieties = async (givenSocietyName: string) => {
      try {
        const usersCollectionRef = collection(db, "users"); // Reference to the users collection
        const usersSnapshot = await getDocs(usersCollectionRef); // Fetch all documents in the users collection

        const cardList: any[] = [];

        // Iterate through all user documents
        usersSnapshot.forEach((userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userName = userData.name || userData.firstName;
            const userId = userDoc.id;
            const email = userData.email; // Get the user email
            console.log("email", email, "userName", userName);

            // Check if `mySociety` exists before iterating
            if (userData.mySociety) {
              userData.mySociety.forEach((societyObj: SocietyObj) => {
                const [societyName, societyDetails] =
                  Object.entries(societyObj)[0];

                // Filter for the given societyName
                if (societyName === givenSocietyName && societyDetails.myWing) {
                  Object.entries(societyDetails.myWing).forEach(
                    ([wing, wingData]) => {
                      if (wingData.floorData) {
                        Object.entries(wingData.floorData).forEach(
                          ([floorName, flats]: [string, any]) => {
                            Object.entries(flats).forEach(
                              ([flatNumber, flatDetails]: [string, any]) => {
                                cardList.push({
                                  id: `${societyName}-${flatNumber}-${userId}`, // Include userId for uniqueness
                                  societyName,
                                  role: `${wing} ${flatNumber} ${
                                    flatDetails.userType || "Owner"
                                  }`,
                                  flatDetails,
                                  wing,
                                  floorName,
                                  flatNumber,
                                  userName,
                                  userId,
                                  email, // Add email field
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
          }
        });

        setCards(cardList); // Update cards state with all fetched data
      } catch (error) {
        console.error("Error fetching society data:", error);
      }
    };

    fetchSocieties(societyName);
  }, []);

  const handlePress = (button: string) => {
    setSelectedButton(button);
  };

  const renderPendingAprovalItem = ({ item }: { item: any }) => {
    const { userName, wing,  flatDetails, role } = item;
    const { userType } = flatDetails;

    return (
      <TouchableOpacity
        style={[styles.cardContainer, { backgroundColor: "#ffcbd1" }]}
        onPress={() => {
          router.push({
            pathname: "/admin/Managemembers/ApproveMember",
            params: {
              itemdetail: JSON.stringify(item),
              // Add other necessary params if available
            },
          });
        }}
      >
        {/* Avatar */}
        <Avatar.Text
          size={40}
          label={userName?.charAt(0)?.toUpperCase() || "?"}
          style={styles.avatar}
        />

        {/* Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userDetails}>
            {wing} {role.split(" ")[1]} • {userType}
          </Text>
        </View>

        {/* Call Icon */}
        <IconButton icon="phone" iconColor="#6200ee" onPress={() => {}} />
      </TouchableOpacity>
    );
  };

  const renderApprovedItems = ({ item }: { item: any }) => {
    const { userName, wing, flatDetails, role } = item;
    const { userType } = flatDetails;

    return (
      <TouchableOpacity
        style={[styles.cardContainer, { backgroundColor: "FFFFFF" }]}
        onPress={() => {
          router.push({
            pathname: "/admin/Managemembers/ApproveMember",
            params: {
              itemdetail: JSON.stringify(item),
              // Add other necessary params if available
            },
          });
        }}
      >
        {/* Avatar */}
        <Avatar.Text
          size={40}
          label={userName?.charAt(0)?.toUpperCase() || "?"}
          style={styles.avatar}
        />

        {/* Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userDetails}>
            {wing} {role.split(" ")[1]} • {userType}
          </Text>
        </View>

        {/* Call Icon */}
        <IconButton icon="phone" iconColor="#6200ee" onPress={() => {}} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => {}} iconColor="white" />
        <Text style={styles.headerTitle}>Members</Text>
        <View style={styles.headerIcons}>
          <IconButton icon="magnify" onPress={() => {}} iconColor="white" />
          <IconButton
            icon="dots-vertical"
            onPress={() => {}}
            iconColor="white"
          />
        </View>
      </View>

      {/* Summary Section */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>Members: 0</Text>
        <Text style={styles.summaryText}>Population: 0</Text>
      </View>

      {/* Pending Approval Section */}
      {cards.length > 0 && (
        <View>
          <FlatList
            data={cards.filter(
              (item) => item.flatDetails.userStatus === "Pending Approval"
            )} // Filter for Approved flats
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderPendingAprovalItem}
            // scrollEnabled={false} // Disable scrolling
          />
        </View>
      )}

      {/* Buttons Section */}
      <View style={styles.buttonsContainer}>
        {wingNames.map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.button,
              selectedButton === item && styles.buttonSelected,
            ]}
            onPress={() => handlePress(item)}
          >
            <Text
              style={[
                styles.buttonText,
                selectedButton === item && styles.buttonTextSelected,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Approved Section */}
      <FlatList
        data={cards.filter(
          (item) =>
            item.flatDetails.userStatus === "Approved" && // Filter for "Approved" status
            item.wing === selectedButton // Filter for the selected wing
        )}
        keyExtractor={(item) => item.id}
        renderItem={renderApprovedItems}
        ListEmptyComponent={
          <View style={styles.noMembersContainer}>
            <IconButton
              icon="file-document-outline"
              size={64}
              iconColor="#ccc"
            />
            <Text style={styles.noMembersText}>No Members.</Text>
          </View>
        }
      />

      {/* No Members Section */}

      {/* Floating Action Button */}
      <View
        style={[
          styles.footer,
          { bottom: insets.bottom },
        ]}
      >
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          router.push("/admin/Managemembers/AddMember"); // Navigate to AddMember screen
        }}
      />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#6200ee",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  headerIcons: {
    flexDirection: "row",
    color: "#fff",
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#6200ee",
    marginBottom: 16,
  },
  summaryText: {
    color: "#fff",
    fontSize: 16,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  button: {
    borderWidth: 1,
    borderColor: "#6200ee",
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginHorizontal: 5,
  },
  buttonSelected: {
    backgroundColor: "#6200ee",
  },
  buttonText: {
    fontSize: 16,
    color: "#6200ee",
    textAlign: "center",
  },
  buttonTextSelected: {
    color: "#fff",
  },
  noMembersContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  noMembersText: {
    color: "#ccc",
    fontSize: 16,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#6200ee",
  },
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1, // Add a visible border
    borderColor: "#ccc", // Set the border color (e.g., light gray)
    marginHorizontal: 10,
  },
  avatar: {
    backgroundColor: "#2196F3",
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  userDetails: {
    fontSize: 14,
    color: "#666",
  },
  footer: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,   // 👈 ensures it's always visible at bottom
    backgroundColor: "#fff",
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
});

export default MembersScreen;
