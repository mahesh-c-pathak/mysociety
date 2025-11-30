import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import React, { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { IconButton, Divider, List } from "react-native-paper";

import { db } from "@/firebaseConfig";
import {
  collection,
  deleteField,
  doc,
  getDoc,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";
import AppbarComponent from "@/components/AppbarComponent";
import MenuComponent from "@/components/AppbarMenuComponent";

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

type UserDetails = {
  [userId: string]: {
    userName: string;
    userStatus: string;
    userType: string;
    userEmail: string;
    usermobileNumber: string;
    active: boolean;
    startDate: string;
  };
};

const ApproveMember = () => {
  const router = useRouter(); // Router for navigation
  useCustomBackHandler();

  const { itemdetail, pendingAproval } = useLocalSearchParams();
  const parsedItemDetail = JSON.parse(itemdetail as string);

  const parseduserId = parsedItemDetail.userId;
  const parsedsocietyName = parsedItemDetail.societyName;
  const parsedwing = parsedItemDetail.wing;
  const parsedfloorName = parsedItemDetail.floorName;
  const parsedflatNumber = parsedItemDetail.flatNumber;
  const parsedItemDetailUserType = parsedItemDetail.flatDetails.userType;
  const parsedItemDetailFlatType = parsedItemDetail.flatDetails.flatType;

  const parsedUserName = parsedItemDetail.userName;
  const parsedUserEmail = parsedItemDetail.email;
  const parsedMobileNumber = parsedItemDetail.mobileNumber;

  const customWingsSubcollectionName = `${parsedsocietyName} wings`;
  const customFloorsSubcollectionName = `${parsedsocietyName} floors`;
  const customFlatsSubcollectionName = `${parsedsocietyName} flats`;

  const flatRef = `Societies/${parsedsocietyName}/${customWingsSubcollectionName}/${parsedwing}/${customFloorsSubcollectionName}/${parsedfloorName}/${customFlatsSubcollectionName}/${parsedflatNumber}`;

  let rentFlatOwner = null; // userId

  if (parsedItemDetail.flatDetails.flatType === "Rent") {
    rentFlatOwner = parsedItemDetail.rentOwnerDetails;
    // console.log("Owner name:", rentFlatOwner);
  }
  //console.log("parseduserId", parseduserId);
  console.log("parsedItemDetailFlatType", parsedItemDetailFlatType);

  const addUserDetailsToFlat = async (
    societyName: string,
    wing: string,
    floorName: string,
    flatNumber: string,
    userName: string,
    userId: string,
    approvalStatus: string,
    userType: string,
    flatType: string,
    userEmail: string,
    usermobileNumber: string
  ) => {
    try {
      const flatDocRef = doc(
        db,
        "Societies",
        societyName,
        `${societyName} wings`,
        wing,
        `${societyName} floors`,
        floorName,
        `${societyName} flats`,
        flatNumber
      );

      // Fetch the current flat data
      const flatSnapshot = await getDoc(flatDocRef);
      // 🕓 Use current date as new "fromDate"
      const start = new Date();

      let currentDetails: UserDetails = {};
      if (flatSnapshot.exists()) {
        currentDetails = flatSnapshot.data().userDetails || {};
      }

      // Check if the userId exists and update or add new
      if (
        currentDetails[userId] &&
        typeof currentDetails[userId] === "object"
      ) {
        currentDetails[userId].userStatus = approvalStatus; // Update status
        currentDetails[userId].userType = userType; // Update userType if needed
        currentDetails[userId].active = true;
        currentDetails[userId].usermobileNumber = usermobileNumber;
        currentDetails[userId].startDate = start.toISOString();
      } else {
        // Add a new user if userId doesn't exist
        currentDetails[userId] = {
          userName,
          userStatus: approvalStatus,
          userType,
          userEmail,
          usermobileNumber,
          active: true,
          startDate: start.toISOString(),
        };
      }

      // Prepare conditional updates for other fields
      const updates: any = {
        userDetails: currentDetails, // Update the userDetails object
      };

      if (approvalStatus === "Denied Approval") {
        if (flatType === "Rent") {
          if (userType === "Renter") {
            updates.renterRegisterd = "Notregistered";
            updates.memberStatus = "Notregistered";
          } else {
            updates.ownerRegisterd = "Notregistered";
          }
        } else {
          updates.ownerRegisterd = "Notregistered";
          updates.memberStatus = "Notregistered";
        }
      } else if (approvalStatus === "Approved") {
        if (flatType === "Rent") {
          if (userType === "Renter") {
            updates.renterRegisterd = "Registered";
            updates.memberStatus = "Registered";
          } else {
            updates.ownerRegisterd = "Registered";
          }
        } else {
          updates.ownerRegisterd = "Registered";
          updates.memberStatus = "Registered";
        }
      }

      if (approvalStatus === "Approved") {
        if (flatType === "Rent") {
          if (userType === "Renter") {
            updates.renterRegisterd = "Registered";
            updates.memberStatus = "Registered";
          } else {
            updates.ownerRegisterd = "Registered";
          }
        } else {
          updates.ownerRegisterd = "Registered";
          updates.memberStatus = "Registered";
        }
      }

      // Update the document fields
      // console.log("Before update:", currentDetails[userId]);
      await updateDoc(flatDocRef, updates);
      // console.log("Updating Firestore with:", updates);

      console.log("Flat document updated successfully with user details");
    } catch (error) {
      console.error("Error updating flat details:", error);
    }
  };

  const handleUserApproval = async (
    userId: string,
    societyName: string,
    wing: string,
    floor: string,
    flatNumber: string,
    approvalStatus: string
  ) => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDocSnapshot = await getDoc(userDocRef);

      if (userDocSnapshot.exists()) {
        const userData = userDocSnapshot.data();

        if (userData?.mySociety) {
          const updatedSocietyData = userData.mySociety.map(
            (societyObj: SocietyObj) => {
              const [currentSocietyName, societyDetails] =
                Object.entries(societyObj)[0];

              if (
                currentSocietyName === societyName &&
                societyDetails?.myWing &&
                societyDetails.myWing[wing]?.floorData &&
                societyDetails.myWing[wing].floorData[floor]?.[flatNumber]
              ) {
                const updatedWingData = {
                  ...societyDetails.myWing,
                  [wing]: {
                    ...societyDetails.myWing[wing],
                    floorData: {
                      ...societyDetails.myWing[wing].floorData,
                      [floor]: {
                        ...societyDetails.myWing[wing].floorData[floor],
                        [flatNumber]: {
                          ...societyDetails.myWing[wing].floorData[floor][
                            flatNumber
                          ],
                          userStatus: approvalStatus,
                        },
                      },
                    },
                  },
                };

                addUserDetailsToFlat(
                  societyName,
                  wing,
                  floor,
                  flatNumber,
                  parsedUserName,
                  userId,
                  approvalStatus,
                  parsedItemDetailUserType,
                  parsedItemDetailFlatType,
                  parsedUserEmail,
                  parsedMobileNumber
                );

                return {
                  [currentSocietyName]: {
                    ...societyDetails,
                    myWing: updatedWingData,
                  },
                };
              }

              return societyObj;
            }
          );

          await updateDoc(userDocRef, { mySociety: updatedSocietyData });
          return true;
        } else {
          console.error("No society data found for this user.");
          return false;
        }
      } else {
        console.error("User document does not exist.");
        return false;
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      return false;
    }
  };

  const handleActivate = () => {
    Alert.alert(
      "Confirmation",
      "Are you sure you want to make the person active?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: async () => {
            const isSuccess = await handleUserApproval(
              parseduserId,
              parsedsocietyName,
              parsedwing,
              parsedfloorName,
              parsedflatNumber,
              "Approved"
            );

            if (isSuccess) {
              Alert.alert("Success", "Member activated successfully", [
                {
                  text: "OK",
                  onPress: () => router.replace("/admin/Managemembers"),
                },
              ]);
            }
          },
        },
      ]
    );
  };

  const handleDecline = () => {
    Alert.alert(
      "Confirmation",
      "Are you sure you want to decline approval to the person?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: async () => {
            const isSuccess = await handleUserApproval(
              parseduserId,
              parsedsocietyName,
              parsedwing,
              parsedfloorName,
              parsedflatNumber,
              "Denied Approval"
            );

            if (isSuccess) {
              Alert.alert("Success", "Member request rejected successfully", [
                {
                  text: "OK",
                  onPress: () => router.replace("/admin/Managemembers"),
                },
              ]);
            }
          },
        },
      ]
    );
  };

  const removeExistingUserFromFlat = async (
    societyName: string,
    wing: string,
    floorName: string,
    flatNumber: string,
    flatType: string,
    userType: string,
    userId: string
  ) => {
    try {
      console.log("🚮 Removing existing user:", userId);

      const flatDocRef = doc(
        db,
        "Societies",
        societyName,
        `${societyName} wings`,
        wing,
        `${societyName} floors`,
        floorName,
        `${societyName} flats`,
        flatNumber
      );

      const userRef = doc(db, "users", userId);
      const oldMembersCollectionName = `${societyName}_${wing}_${flatNumber}_oldFlatMembers`;
      const oldMembersRef = collection(flatDocRef, oldMembersCollectionName);

      await runTransaction(db, async (transaction) => {
        // ✅ Step 1: ALL READS FIRST
        const [flatSnap, userSnap] = await Promise.all([
          transaction.get(flatDocRef),
          transaction.get(userRef),
        ]);

        if (!flatSnap.exists()) throw new Error("Flat document not found.");

        const flatData = flatSnap.data();
        const userData = flatData?.userDetails?.[userId];
        if (!userData) throw new Error("User not found in flat userDetails.");

        const userDataSnap = userSnap.exists() ? userSnap.data() : null;

        // ✅ Step 2: Prepare data updates (no writes yet)
        const updates: Record<string, any> = {
          [`userDetails.${userId}`]: deleteField(),
        };

        if (flatType === "Rent") {
          if (userType === "Renter") {
            updates.renterRegisterd = "Notregistered";
            updates.memberStatus = "Notregistered";
          } else {
            updates.ownerRegisterd = "Notregistered";
          }
        } else {
          updates.ownerRegisterd = "Notregistered";
          updates.memberStatus = "Notregistered";
        }

        // ✅ Step 3: Now perform writes (after all reads)
        const newOldMemberRef = doc(oldMembersRef);
        transaction.set(newOldMemberRef, {
          ...userData,
          userId,
          active: false,
          movedOn: new Date().toISOString(),
          endDate: new Date().toISOString(),
        });

        transaction.update(flatDocRef, updates);

        if (userDataSnap) {
          const mySociety = userDataSnap.mySociety || [];
          const societyIndex = mySociety.findIndex(
            (soc: any) => Object.keys(soc)[0] === societyName
          );

          if (societyIndex !== -1) {
            const societyData = mySociety[societyIndex][societyName];
            const updatedSociety = { ...societyData };

            if (
              updatedSociety.myWing?.[wing]?.floorData?.[floorName]?.[
                flatNumber
              ]
            ) {
              delete updatedSociety.myWing[wing].floorData[floorName][
                flatNumber
              ];

              // Clean empty levels
              if (
                Object.keys(updatedSociety.myWing[wing].floorData[floorName])
                  .length === 0
              )
                delete updatedSociety.myWing[wing].floorData[floorName];
              if (
                Object.keys(updatedSociety.myWing[wing].floorData).length === 0
              )
                delete updatedSociety.myWing[wing];
              if (Object.keys(updatedSociety.myWing).length === 0)
                delete updatedSociety.myWing;
            }

            const updatedMySociety = [...mySociety];
            updatedMySociety[societyIndex] = { [societyName]: updatedSociety };

            transaction.update(userRef, { mySociety: updatedMySociety });
          }
        }
      });

      console.log(`✅ User ${userId} removed and archived successfully.`);
    } catch (error) {
      console.error(
        "❌ Transaction failed while removing existing user:",
        error
      );
      Alert.alert("Error", "Failed to remove existing user.");
    }
  };

  const [menuVisible, setMenuVisible] = useState(false);

  // Choose menu items dynamically
  const menuItems =
    parsedItemDetailUserType === "Renter"
      ? [
          "Edit Renter",
          "Edit Owner",
          "Member History",
          "Bill History",
          "Delete Renter",
          "Delete Owner",
          "Close Menu",
        ]
      : ["Edit", "Member History", "Bill History", "Delete", "Close Menu"];

  const handleMenuOptionPress = (option: string) => {
    console.log(`${option} selected`);

    if (option === "Close Menu") {
      setMenuVisible(false);
      return;
    }

    // Extract userId from parsed item
    const parsedUserId = parsedItemDetail?.userId;

    // 🧭 Navigation logic
    if (option === "Edit Renter" || option === "Edit") {
      router.push({
        pathname: "/admin/Managemembers/MemberDetails",
        params: {
          userId: parsedUserId,
          societyName: parsedsocietyName,
          wing: parsedwing,
          floorName: parsedfloorName,
          flatNumber: parsedflatNumber,
          flatType: parsedItemDetailFlatType,
          userType: parsedItemDetailUserType,
        },
      });
      setMenuVisible(false);
      return;
    }

    if (option === "Edit Owner") {
      // Edit Owner of a Flattype Rent rentFlatOwner.userId
      router.push({
        pathname: "/admin/Managemembers/MemberDetails",
        params: {
          societyName: parsedsocietyName,
          wing: parsedwing,
          floorName: parsedfloorName,
          flatNumber: parsedflatNumber,
          flatType: parsedItemDetailFlatType,
          userType: rentFlatOwner.userType,
          userId: rentFlatOwner.userId,
        },
      });
      setMenuVisible(false);
      return;
    }

    if (option === "Delete Owner") {
      Alert.alert(
        "Member Detail",
        "Are you sure you want to delete? This member will go to member history.",
        [
          {
            text: "No",
            style: "cancel",
            onPress: () => console.log("❌ Delete cancelled"),
          },
          {
            text: "Yes",
            style: "destructive",
            onPress: async () => {
              console.log("✅ User confirmed delete Rent Flat Owner");
              try {
                // 🔹 Call your removeExistingUserFromFlat
                await removeExistingUserFromFlat(
                  parsedsocietyName,
                  parsedwing,
                  parsedfloorName,
                  parsedflatNumber,
                  parsedItemDetailFlatType,
                  rentFlatOwner.userType,
                  rentFlatOwner.userId
                );

                // ✅ After success, show alert and navigate
                Alert.alert(
                  "Success",
                  "User removed and archived successfully.",
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        console.log("➡️ Redirecting to Manage Members");
                        router.replace("/admin/Managemembers");
                      },
                    },
                  ]
                );
              } catch (error) {
                console.error("❌ Error while deleting member:", error);
                Alert.alert("Error", "Failed to delete the member.");
              }
            },
          },
        ],
        { cancelable: true }
      );
    }

    // Delete User
    if (option === "Delete" || option === "Delete Renter") {
      Alert.alert(
        "Member Detail",
        "Are you sure you want to delete? This member will go to member history.",
        [
          {
            text: "No",
            style: "cancel",
            onPress: () => console.log("❌ Delete cancelled"),
          },
          {
            text: "Yes",
            style: "destructive",
            onPress: async () => {
              console.log("✅ User confirmed delete");
              try {
                // 🔹 Call your removeExistingUserFromFlat
                await removeExistingUserFromFlat(
                  parsedsocietyName,
                  parsedwing,
                  parsedfloorName,
                  parsedflatNumber,
                  parsedItemDetailFlatType,
                  parsedItemDetailUserType,
                  parsedUserId
                );

                // ✅ After success, show alert and navigate
                Alert.alert(
                  "Success",
                  "User removed and archived successfully.",
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        console.log("➡️ Redirecting to Manage Members");
                        router.replace("/admin/Managemembers");
                      },
                    },
                  ]
                );
              } catch (error) {
                console.error("❌ Error while deleting member:", error);
                Alert.alert("Error", "Failed to delete the member.");
              }
            },
          },
        ],
        { cancelable: true }
      );
    }

    // Handle other options (Member History, Bill History, Delete, etc.)
    console.log(`${option} clicked`);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };

  return (
    <View style={styles.container}>
      <AppbarComponent
        title={`${parsedwing} ${parsedflatNumber}`} // ✅ Correct template literal
        source="Admin"
        onPressThreeDot={() => setMenuVisible(!menuVisible)}
      />
      {/* Three-dot Menu */}
      {/* Custom Menu */}

      {menuVisible && (
        <MenuComponent
          items={menuItems}
          onItemPress={handleMenuOptionPress}
          closeMenu={closeMenu}
        />
      )}

      <ScrollView style={styles.container}>
        {/* Profile */}
        <View style={styles.profileContainer}>
          <TouchableOpacity
            style={[styles.profileImageContainer, { backgroundColor: "#fff" }]}
          >
            <IconButton icon="account" size={80} />
          </TouchableOpacity>
        </View>

        {/* Buttons */}

        {pendingAproval === "True" && (
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.touchableButton, { backgroundColor: "green" }]}
              onPress={() => {
                handleActivate();
              }}
            >
              <Text style={styles.buttonText}>Activate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.touchableButton, { backgroundColor: "red" }]}
              onPress={() => {
                handleDecline();
              }}
            >
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        <Divider />
        {/* Name */}

        <View style={{ flex: 1 }}>
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{parsedItemDetail.userName}</Text>
          </View>
        </View>

        <Divider />
        {/* Phone */}

        <View style={styles.optionsContainer}>
          <View style={styles.row}>
            <IconButton icon="phone" iconColor="#6200ee" onPress={() => {}} />
            <View>
              <Text style={styles.info}>{parsedMobileNumber}</Text>
              <Text style={styles.label}>Mobile</Text>
            </View>
          </View>
        </View>
        <Divider />

        {/* Details Section */}
        <View style={styles.detailsContainer}>
          <View style={styles.row}>
            <List.Icon icon="account-group" />
            <View style={styles.countContainer}>
              <Text>0 </Text>
              <Text> Adult Count</Text>
            </View>
          </View>
          <View style={styles.row}>
            <List.Icon icon="baby" />
            <View style={styles.countContainer}>
              <Text>0 </Text>
              <Text> Child Count</Text>
            </View>
          </View>
        </View>

        <Divider />

        {rentFlatOwner ? (
          <>
            {/* Rent Flat Owner */}
            <View style={styles.optionsContainer}>
              <View style={styles.row}>
                <IconButton
                  icon="phone"
                  iconColor="#6200ee"
                  onPress={() => {}}
                />
                <View>
                  <Text style={styles.label}>Owner Details</Text>
                  <Text style={styles.info}>{rentFlatOwner.userName}</Text>
                  <Text style={styles.label}>{rentFlatOwner.mobileNumber}</Text>
                </View>
              </View>
            </View>
            <Divider />
          </>
        ) : (
          <>
            {/* Add Owner Button */}
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                borderRadius: 8,
                borderColor: "#6200ee",
                borderWidth: 2,
                margin: 16,
              }}
              onPress={() => {
                router.push({
                  pathname: "/admin/Managemembers/MemberDetails",
                  params: {
                    societyName: parsedsocietyName,
                    wing: parsedwing,
                    floorName: parsedfloorName,
                    flatNumber: parsedflatNumber,
                    flatType: "Rent",
                    userType: "Owner",
                    addNew: "true",
                  },
                });
              }}
            >
              <IconButton
                icon="plus"
                iconColor="#6200ee"
                size={20}
                style={{ margin: 0 }}
              />
              <Text style={{ fontSize: 16, marginLeft: -8 }}>
                Add Owner Details
              </Text>
            </TouchableOpacity>

            <Divider />
          </>
        )}

        {/* Options Section */}
        <View style={styles.optionsContainer}>
          <List.Item
            title={`${parsedItemDetailUserType}`}
            left={(props) => <List.Icon {...props} icon="account" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="View Bill History"
            left={(props) => <List.Icon {...props} icon="file-document" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Manage Member History"
            left={(props) => <List.Icon {...props} icon="history" />}
            onPress={() => {
              router.push({
                pathname: "/admin/Managemembers/FlatMemberHistory",
                params: {
                  flatRef,
                  parsedsocietyName,
                  parsedwing,
                  parsedfloorName,
                  parsedflatNumber,
                  parsedItemDetailFlatType,
                  parsedItemDetailUserType,
                  parseduserId,
                  //itemdetail: JSON.stringify(item),
                  // Add other necessary params if available
                },
              });
            }}
          />
          <Divider />
          <View style={styles.optionsContainer}>
            <View style={styles.row}>
              <IconButton
                icon="square"
                iconColor="#6200ee"
                onPress={() => {}}
              />
              <View>
                <Text style={styles.info}>0.00</Text>
                <Text style={styles.label}>Square Feet</Text>
              </View>
            </View>
          </View>
          <Divider />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  profileContainer: {
    alignItems: "center",
    paddingVertical: 5,
    backgroundColor: "#6200ee",
  },

  buttonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // Center horizontally,
    width: "100%",
    marginBottom: 10,
    padding: 16,
  },

  name: {
    fontSize: 18,
    fontWeight: "bold",
    // color: "#fff",
  },
  info: {
    fontSize: 16,
    //color: "#fff",
  },
  label: {
    fontSize: 14,
    //color: "#fff",
  },
  detailsContainer: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionsContainer: {
    marginTop: 10,
  },
  countContainer: {
    marginHorizontal: 10,
  },
  nameContainer: {
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally
    height: 50, // Set a fixed height
    paddingVertical: 8,
    width: "100%", // Ensure it takes full width of the screen
    backgroundColor: "#f5f5f5", // Optional for debugging
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  touchableButton: {
    flex: 1,
    paddingVertical: 16,
    marginHorizontal: 10,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ApproveMember;
