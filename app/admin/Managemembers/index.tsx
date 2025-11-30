import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
} from "react-native";
import { IconButton, FAB, Avatar } from "react-native-paper";
import { useRouter } from "expo-router";

import { db } from "@/firebaseConfig";
import { collection, collectionGroup, getDocs } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSociety } from "@/utils/SocietyContext";
import AppbarComponent from "@/components/AppbarComponent";
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";

const MembersScreen: React.FC = () => {
  const { societyName } = useSociety();
  const insets = useSafeAreaInsets();

  useCustomBackHandler("/admin"); // back always goes to Screen3

  const [selectedButton, setSelectedButton] = useState<string | null>("A");
  const router = useRouter(); // Router for navigation

  // const [cards, setCards] = useState<any[]>([]);
  const [wingNames, setWingNames] = useState<string[]>([]); // State to store wing names
  const customWingsSubcollectionName = `${societyName} wings`;
  // console.log("cards", cards);
  const [cardsNew, setCardsNew] = useState<any[]>([]);
  // console.log("cardsNew", cardsNew);

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
  }, [customWingsSubcollectionName, societyName]);

  useEffect(() => {
    const fetchCardData = async () => {
      try {
        const customFlatsSubcollectionName = `${societyName} flats`;
        const tempMembers: any[] = [];
        const flatsQuerySnapshot = await getDocs(
          collectionGroup(db, customFlatsSubcollectionName)
        );
        flatsQuerySnapshot.forEach((doc) => {
          const flatData = doc.data();

          // 🧠 Skip this flat if flatType is "dead"
          const flatType = flatData?.flatType?.toLowerCase();
          if (flatType === "dead") return;

          const flatId = doc.id;
          const flatPath = doc.ref.path;
          const pathSegments = flatPath.split("/");
          const wing = pathSegments[3];
          const floor = pathSegments[5];
          const userDetails = flatData.userDetails || {};

          // 🧩 Start with all userDetails
          let includedUsers = Object.entries(userDetails);

          // 🏠 If flatType is "rent", include only renter users
          let ownerInfo: any = null;
          if (flatType === "rent") {
            // find owner (for reference)
            const ownerEntry = Object.entries(userDetails).find(
              ([_D, info]: [string, any]) =>
                info.userType?.toLowerCase() === "owner"
            );
            if (ownerEntry) {
              const [ownerId, info]: [string, any] = ownerEntry; // <-- get ownerId from key
              ownerInfo = {
                userName: info.userName || "",
                userId: ownerId || "", // <-- FIX: correct owner userId
                userType: info.userType || "",
                email: info.userEmail || "",
                mobileNumber: info.usermobileNumber || "",
              };
            }

            includedUsers = includedUsers.filter(
              ([, userInfo]: [string, any]) =>
                userInfo.userType?.toLowerCase() === "renter"
            );
          }

          if (includedUsers.length > 0) {
            // Now process includedUsers
            includedUsers.forEach(([userId, userInfo]: [string, any]) => {
              // your logic to push into cardList or similar
              const userName = userInfo.userName || "";
              const userType = userInfo.userType || "";
              const email = userInfo.userEmail || "";
              const userStatus = userInfo.userStatus;
              const mobileNumber = userInfo.usermobileNumber;
              // ✅ Build flatDetails with 3 consistent fields
              const flatDetails = {
                flatType: flatData.flatType || "",
                userStatus,
                userType,
              };
              tempMembers.push({
                id: `${societyName}-${flatId}-${userId}`,
                societyName,
                role: `${wing} ${flatId} ${userType || "Owner"}`,
                flatDetails,
                wing,
                floorName: floor,
                flatNumber: flatId,
                userName,
                userId,
                email,
                mobileNumber,
                rentOwnerDetails: ownerInfo, // ✅ include owner data here if any
              });
              console.log("wing Flat", wing, flatId);
            }); // end forEach
          } // end If
        }); // end flatsQuerySnapshot.foreach

        setCardsNew(tempMembers);
      } catch (error) {
        console.error("Error fetching society data:", error);
      }
    };
    if (societyName) fetchCardData();
  }, [societyName]);

  const handlePress = (button: string) => {
    setSelectedButton(button);
  };

  const renderPendingAprovalItem = ({ item }: { item: any }) => {
    const { userName, wing, flatDetails, role } = item;
    const { userType } = flatDetails;

    return (
      <TouchableOpacity
        style={[styles.cardContainer, { backgroundColor: "#ffcbd1" }]}
        onPress={() => {
          router.push({
            pathname: "/admin/Managemembers/ApproveMember",
            params: {
              itemdetail: JSON.stringify(item),
              pendingAproval: "True",
              // Add other necessary params if available
            },
          });
        }}
      >
        {/* Avatar */}
        <Avatar.Text
          size={40}
          label={userName?.charAt(0)?.toUpperCase() || "?"}
          style={{
            backgroundColor:
              userType?.toLowerCase() === "owner"
                ? "#2196F3" // Blue for Owner
                : userType?.toLowerCase() === "renter"
                  ? "#FFA500" // Orange for Rent
                  : "#9E9E9E", // Default Grey for others
          }}
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
          style={{
            backgroundColor:
              userType?.toLowerCase() === "owner"
                ? "#2196F3" // Blue for Owner
                : userType?.toLowerCase() === "renter"
                  ? "#FFA500" // Orange for Rent
                  : "#9E9E9E", // Default Grey for others
          }}
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
      <AppbarComponent
        title="Members"
        source="Admin"
        onPressSearch={() => console.log("Search pressed")}
        onPressThreeDot={() => console.log("Three dot pressed")}
        backRoute="/admin" // 👈 ensures same behavior as custom back handler
      />

      {/* Summary Section */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>Members: 0</Text>
        <Text style={styles.summaryText}>Population: 0</Text>
      </View>

      {/* Pending Approval Section */}
      {cardsNew.length > 0 && (
        <View>
          <FlatList
            data={cardsNew.filter(
              (item) => item.flatDetails.userStatus === "Pending Approval"
            )} // Filter for Approved flats
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderPendingAprovalItem}
            // scrollEnabled={false} // Disable scrolling
          />
        </View>
      )}

      {/* Buttons Section */}
      <View style={{ paddingVertical: 8, marginVertical: 16 }}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.buttonsContainer}
          showsHorizontalScrollIndicator={false}
        >
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
        </ScrollView>
      </View>

      {/* Approved Section */}
      {/* Approved Section */}
      <FlatList
        data={cardsNew
          .filter((item) => {
            const { flatDetails, wing } = item;
            const { userStatus, flatType, userType } = flatDetails;

            // ✅ Show only approved members for the selected wing
            if (userStatus !== "Approved" || wing !== selectedButton)
              return false;

            // ✅ If flat is "Rent", show only renters
            if (flatType === "Rent" && userType !== "Renter") return false;

            return true;
          })
          .sort((a, b) => {
            // ✅ Sort by wing alphabetically first
            if (a.wing < b.wing) return -1;
            if (a.wing > b.wing) return 1;

            // ✅ Then sort numerically by flat number (handles "001", "SB1", "G", etc.)
            const extractNumber = (flat: string): number => {
              if (!flat) return 0;
              if (flat === "G" || flat.toLowerCase() === "ground") return 0; // handle ground floor
              const sbMatch = flat.match(/SB(\d+)/i); // Sub-basement
              if (sbMatch) return -parseInt(sbMatch[1], 10);
              const numMatch = flat.match(/\d+/);
              return numMatch ? parseInt(numMatch[0], 10) : 0;
            };

            return extractNumber(a.flatNumber) - extractNumber(b.flatNumber);
          })}
        keyExtractor={(item) => item.id}
        renderItem={renderApprovedItems}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
        }}
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
      <View style={[styles.footer, { bottom: insets.bottom }]}>
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
    marginHorizontal: 16,
    paddingRight: 48,
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
    marginBottom: 4,
    borderRadius: 8,
    borderWidth: 1, // Add a visible border
    borderColor: "#ccc", // Set the border color (e.g., light gray)
    marginHorizontal: 10,
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
    bottom: 0, // 👈 ensures it's always visible at bottom
    backgroundColor: "#fff",
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
});

export default MembersScreen;
