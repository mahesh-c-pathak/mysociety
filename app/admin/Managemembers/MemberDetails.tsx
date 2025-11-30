import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { Button, Text } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import AppbarComponent from "@/components/AppbarComponent";
import CustomInput from "@/components/CustomInput";
import { db } from "@/firebaseConfig";
import { doc, getDoc, runTransaction } from "firebase/firestore";
import LoadingIndicator from "@/components/LoadingIndicator";
import { getFunctions, httpsCallable } from "firebase/functions";
import { globalStyles } from "@/styles/globalStyles";

const MemberDetails: React.FC = () => {
  const {
    societyName,
    wing,
    floorName,
    flatNumber,
    flatType,
    userType,
    userId, // 👈 add this line
  } = useLocalSearchParams() as {
    societyName: string;
    wing: string;
    floorName: string;
    flatNumber: string;
    flatType: string;
    userType: string;
    userId?: string; // 👈 optional param
  };

  const router = useRouter();
  const isEditMode = !!userId; // ✅ true if userId is passed

  const functions = getFunctions();
  const checkUserExistsFn = httpsCallable(functions, "checkUserExists");
  const createUserByAdminFn = httpsCallable(functions, "createUserByAdmin");

  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [firstName, setfirstName] = useState<string>("");
  const [lastName, setlastName] = useState<string>("");

  const [countryCode, setCountryCode] = useState("+91");
  const [mobileNumber, setMobileNumber] = useState("");

  const fromDate = new Date();

  // Edit user Mode

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (isEditMode) {
        console.log("📝 Edit mode enabled for user:", userId);
        // TODO: fetch existing user data for editing
        try {
          const userDocRef = doc(db, "users", userId as string);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setfirstName(userData.firstName || "");
            setlastName(userData.lastName || "");
            setMobileNumber(userData.mobileNumber || "");
            setEmail(userData.email || "");
          } else {
            Alert.alert("Error", "User not found.");
          }
        } catch (error) {
          console.error("Error fetching User details:", error);
          Alert.alert("Error", "Failed to fetch User details.");
        }
      }
    };
    fetchUserDetails();
  }, [isEditMode, userId]);

  // Edit user Mode handleUpdateUserDetail

  const handleUpdateUserDetail = async () => {
    try {
      setLoading(true);
      console.log("🚀 Running transaction for user:", userId);

      if (!userId) {
        Alert.alert("Error", "User ID is missing for update.");
        return;
      }

      const userDocRef = doc(db, "users", userId);

      await runTransaction(db, async (transaction) => {
        // 🔹 1️⃣ READ USER DOC
        const userSnap = await transaction.get(userDocRef);
        if (!userSnap.exists()) {
          throw new Error("User document not found.");
        }

        const userData = userSnap.data();
        const mySociety = userData.mySociety || [];

        // 🔹 Find matching society
        const societyEntry = mySociety.find(
          (soc: any) => Object.keys(soc)[0] === societyName
        );
        if (!societyEntry) {
          throw new Error("No flats found for this user in the society.");
        }

        const societyData = societyEntry[societyName];
        const wings = societyData.myWing || {};

        // 🔹 Collect all flats to update
        const flatsToUpdate: { ref: any; userDetails: any }[] = [];

        for (const [wingName, wingData] of Object.entries(wings) as [
          string,
          any,
        ][]) {
          const floors = wingData.floorData || {};
          for (const [floorName, floorData] of Object.entries(floors)) {
            for (const [flatNumber] of Object.entries(
              floorData as Record<string, any>
            )) {
              const flatRef = doc(
                db,
                "Societies",
                societyName,
                `${societyName} wings`,
                wingName,
                `${societyName} floors`,
                floorName,
                `${societyName} flats`,
                flatNumber
              );

              const flatSnap = await transaction.get(flatRef); // ✅ All reads happen here
              if (!flatSnap.exists()) continue;

              const flatData = flatSnap.data();
              const userDetails = flatData.userDetails || {};

              if (userDetails[userId]) {
                const updatedUserDetails = {
                  ...userDetails[userId],
                  userName: `${firstName} ${lastName}`,
                  usermobileNumber: mobileNumber,
                };

                flatsToUpdate.push({
                  ref: flatRef,
                  userDetails: updatedUserDetails,
                });
              }
            }
          }
        }

        // 🔹 2️⃣ WRITE PHASE (after all reads)
        transaction.update(userDocRef, {
          firstName,
          lastName,
          displayName: `${firstName} ${lastName}`,
          mobileNumber,
          countryCode,
          updatedAt: Date.now(),
        });

        for (const { ref, userDetails } of flatsToUpdate) {
          transaction.update(ref, {
            [`userDetails.${userId}`]: userDetails,
          });
        }
      });

      console.log(
        "✅ Transaction successful — user details updated across flats."
      );

      Alert.alert(
        "Success",
        "User details updated successfully across all flats.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/admin/Managemembers/AddMember"),
          },
        ]
      );
    } catch (error) {
      console.error("❌ Transaction failed:", error);
      Alert.alert("Error", "Failed to update user details across flats.");
    } finally {
      setLoading(false);
    }
  };

  // handleRegister

  const handleRegister = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !mobileNumber.trim()
    ) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    const emailLower = email.toLowerCase();

    setLoading(true);

    try {
      let userId: string | null = null;

      // ✅ Check if user already exists (Auth)
      const checkRes: any = await checkUserExistsFn({ email: emailLower });
      const data = checkRes.data;

      if (data.exists) {
        console.log("⚠️ User exists, updating Firestore data.");
        userId = data.uid; // ✅ assign UID directly from Auth
      } else {
        // ✅ If user not found → create Auth user via Cloud Function
        console.log("🆕 Creating new user via Cloud Function...");
        const createRes: any = await createUserByAdminFn({
          users: [{ email: emailLower }],
        });

        const result = createRes.data.results[0];
        if (!result.success) {
          throw new Error(result.reason || "User creation failed.");
        }

        userId = result.uid; // ✅ assign to outer variable (no const here!)

        if (!userId) return;

        console.log("✅ Firestore new user created.");
      }

      if (
        !societyName ||
        !wing ||
        !floorName ||
        !flatNumber ||
        !flatType ||
        !userType
      ) {
        console.error("❌ Missing required params:", {
          societyName,
          wing,
          floorName,
          flatNumber,
          flatType,
          userType,
        });

        Alert.alert("Error", "Required flat or user data missing!");
        return;
      }

      // ✅ Update flat data (single call)
      if (userId) {
        await runTransaction(db, async (transaction) => {
          const userDocRef = doc(db, "users", userId);
          const flatRef = doc(
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

          const userSnap = await transaction.get(userDocRef);
          const flatSnap = await transaction.get(flatRef);

          if (!flatSnap.exists()) {
            throw new Error("Flat not found in Firestore");
          }

          // 🔹 If user exists → use displayName from Firestore
          let finalUserName = `${firstName} ${lastName}`;

          // 🔹 Prepare user data
          const baseUserData = {
            firstName,
            lastName,
            email: email.toLowerCase(),
            mobileNumber,
            countryCode,
            displayName: finalUserName,
            updatedAt: Date.now(),
            approved: true,
          };

          let updatedMySociety: any[] = [];

          if (!userSnap.exists()) {
            // ✅ Create new Firestore user doc
            updatedMySociety = [
              {
                [societyName]: {
                  myWing: {
                    [wing]: {
                      floorData: {
                        [floorName]: {
                          [flatNumber]: {
                            userType,
                            userStatus: "Approved",
                            flatType,
                          },
                        },
                      },
                    },
                  },
                },
              },
            ];

            transaction.set(userDocRef, {
              ...baseUserData,
              createdBy: "admin",
              isPreCreated: true,
              mySociety: updatedMySociety,
            });
          } else {
            const userData = userSnap.data();
            finalUserName = userData.displayName; // ← pick name from Firestore
            const mySociety = userData.mySociety || [];

            const societyIndex = mySociety.findIndex(
              (society: any) => Object.keys(society)[0] === societyName
            );

            if (societyIndex === -1) {
              // 🆕 Add new society entry
              updatedMySociety = [
                ...mySociety,
                {
                  [societyName]: {
                    myWing: {
                      [wing]: {
                        floorData: {
                          [floorName]: {
                            [flatNumber]: {
                              userType,
                              userStatus: "Approved",
                              flatType,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              ];
            } else {
              // 🔁 Deep merge existing
              const societyData = mySociety[societyIndex][societyName];
              const updatedSocietyData = {
                ...societyData,
                myWing: {
                  ...societyData.myWing,
                  [wing]: {
                    ...societyData.myWing?.[wing],
                    floorData: {
                      ...societyData.myWing?.[wing]?.floorData,
                      [floorName]: {
                        ...societyData.myWing?.[wing]?.floorData?.[floorName],
                        [flatNumber]: {
                          userType,
                          userStatus: "Approved",
                          flatType,
                        },
                      },
                    },
                  },
                },
              };

              updatedMySociety = [...mySociety];
              updatedMySociety[societyIndex] = {
                [societyName]: updatedSocietyData,
              };
            }

            transaction.update(userDocRef, {
              mySociety: updatedMySociety,
            });
          }

          // 🔹 Flat data update
          const start = new Date(fromDate);
          const newUser = {
            userName: finalUserName,
            userStatus: "Approved",
            userType,
            userEmail: email,
            usermobileNumber: mobileNumber,
            active: true,
            startDate: start.toISOString(),
          };

          const updates: Record<string, any> = {};
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

          transaction.update(flatRef, {
            ...updates,
            [`userDetails.${userId}`]: newUser,
          });
        });

        console.log("✅ Transaction completed successfully");
        Alert.alert("Success", "User and flat data updated successfully", [
          {
            text: "OK",
            onPress: () => router.push("/admin/Managemembers/AddMember"),
          },
        ]);
      }
    } catch (error: any) {
      console.error("❌ Registration Error:", error);
      Alert.alert("Error", error.message || "Failed to register user");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={globalStyles.container}>
      <AppbarComponent title="Add Member" source="Admin" />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.flatNumber}>
          Flat Number: {wing} {flatNumber} {flatType} {userType}
        </Text>

        {/* Personal Details */}

        {/* First Name */}
        <View style={styles.customInputContainer}>
          <CustomInput
            label="First Name"
            value={firstName}
            onChangeText={setfirstName}
          />
        </View>
        {/* Last Name */}
        <View style={styles.customInputContainer}>
          <CustomInput
            label="Last Name"
            value={lastName}
            onChangeText={setlastName}
          />
        </View>

        {/* Phone Number */}

        <Text style={styles.label}>Mobile Number</Text>
        <View style={styles.inputContainer}>
          <View style={{ width: 60, marginRight: 6 }}>
            <CustomInput
              value={countryCode}
              onChangeText={setCountryCode}
              editable={false}
              style={{ backgroundColor: "#f0f0f0" }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <CustomInput value={mobileNumber} onChangeText={setMobileNumber} />
          </View>
        </View>

        {/* Email */}
        <View style={styles.customInputContainer}>
          <CustomInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            editable={!isEditMode} // 👈 Disable in edit mode
            style={!isEditMode ? {} : { backgroundColor: "#f0f0f0" }} // ✅ Only grey when disabled
          />
        </View>

        {/* Save Button */}
        <Button
          mode="contained"
          style={styles.saveButton}
          onPress={isEditMode ? handleUpdateUserDetail : handleRegister} // 👈 dynamic
        >
          {isEditMode ? "Update" : "Save"} {/* 👈 dynamic title */}
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  customInputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    marginBottom: 5,
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  contentContainer: {
    padding: 16,
  },
  flatNumber: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
  },

  saveButton: {
    marginTop: 16,
  },
});

export default MemberDetails;
