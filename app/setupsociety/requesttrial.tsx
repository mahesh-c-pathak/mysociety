import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  Text,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
// ✅ new unified setup function
import { initializeFullSocietySetup } from "@/utils/SetupWIngs/initializeFullSocietySetup";

import {
  doc,
  collection,
  updateDoc,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthRole } from "@/lib/authRole";
import AppbarComponent from "@/components/AppbarComponent";

const RequestTrialScreen: React.FC = () => {
  const [societyName, setSocietyName] = useState("");
  const [totalWings, setTotalWings] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [city, setCity] = useState("Pune");
  const [pincode, setPincode] = useState("");
  const [address, setAddress] = useState("");
  const router = useRouter();
  const { user } = useAuthRole();
  const insets = useSafeAreaInsets();

  const [customWingNames, setCustomWingNames] = useState<string[]>([]);

  const [loading, setLoading] = useState<boolean>(false);

  const generateUniqueSocietyCode = async (): Promise<string> => {
    const societiesRef = collection(db, "Societies");
    let uniqueCode = ""; // ✅ Initialize to avoid TS error
    let exists = true;

    while (exists) {
      uniqueCode = Math.floor(1000 + Math.random() * 9000).toString();
      const querySnapshot = await getDoc(doc(societiesRef, uniqueCode));
      exists = querySnapshot.exists();
    }

    return uniqueCode; // ✅ Always defined
  };

  const assignAdminRole = async (userId: string, societyName: string) => {
    try {
      const userDocRef = doc(db, "users", userId);

      // Update the user's mySociety field to include the Admin role
      await updateDoc(userDocRef, {
        mySociety: arrayUnion({
          [societyName]: {
            memberRole: ["Admin"], // Assign "Admin" role
          },
        }),
      });

      console.log(
        `Admin role assigned successfully for society: ${societyName}`
      );
    } catch (error) {
      console.error("Error assigning Admin role:", error);
    }
  };

  const validateAndSubmit = async () => {
    if (!societyName || !totalWings || !pincode) {
      Alert.alert("Validation Error", "Please fill in all the fields.");
      return;
    }

    if (
      customWingNames.length > 0 &&
      customWingNames.filter((n) => n.trim() !== "").length !==
        Number(totalWings)
    ) {
      Alert.alert(
        "Validation Error",
        "Please enter all custom wing names or leave them all blank."
      );
      return;
    }
    setLoading(true);

    try {
      const societiesRef = collection(db, "Societies");
      const societyDocRef = doc(societiesRef, societyName);

      // Check if the society already exists
      const societyDocSnap = await getDoc(societyDocRef);
      if (societyDocSnap.exists()) {
        Alert.alert(
          "Duplicate Society",
          `A society with the name "${societyName}" already exists. Please choose a different name.`
        );
        return;
      }

      // Generate unique society code
      const societyCode = await generateUniqueSocietyCode();

      // ✅ Use the unified setup function
      await initializeFullSocietySetup(
        societyName,
        Number(totalWings),
        state,
        city,
        pincode,
        address,
        societyCode,
        user?.uid ?? "",
        customWingNames.filter((n) => n.trim() !== "") // ✅ pass only filled names
      );

      // ✅ Step 4: Assign Admin role in the user's document
      assignAdminRole(user!.uid, societyName);

      Alert.alert("Success", "Society and wings initialized successfully!");
      router.push({
        pathname: "/setupsociety/SetupWingsScreen",
        params: { societyName, totalWings },
      });
    } catch (error) {
      Alert.alert("Error", "Failed to save data. Please try again.");
      console.error("Firebase Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5e35b1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Appbar */}
      <AppbarComponent title="Request a Trial" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0} // offset for header height
        style={styles.container}
      >
        <FlatList
          data={[{}]} // Use a single-item list to render your UI
          renderItem={() => (
            <View style={styles.container}>
              <Text style={styles.title}>Building Details</Text>
              {/* Society Name */}
              <View style={styles.customInputContainer}>
                <CustomInput
                  label="Society Name"
                  value={societyName}
                  onChangeText={setSocietyName}
                />
              </View>

              {/* Total Wings/Blocks/Buildings */}
              <View style={styles.customInputContainer}>
                <CustomInput
                  label="Total Wings/Blocks/Buildings"
                  value={totalWings}
                  onChangeText={setTotalWings}
                  keyboardType="numeric"
                />
              </View>

              {/* Custom Wing Names (Optional) */}
              {Number(totalWings) > 0 && (
                <View style={{ marginBottom: 20, marginHorizontal: 20 }}>
                  <Text style={{ fontWeight: "bold", marginBottom: 8 }}>
                    Optional: Enter Custom Wing Names
                  </Text>
                  <View style={{ marginRight: 80 }}>
                    {Array.from({ length: Number(totalWings) }, (_, i) => (
                      <CustomInput
                        key={i}
                        label={`Wing ${i + 1} Name`}
                        value={customWingNames[i] || ""}
                        onChangeText={(text) => {
                          const updated = [...customWingNames];
                          updated[i] = text.trim();
                          setCustomWingNames(updated);
                        }}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* State Dropdown */}
              <View style={styles.customInputContainer}>
                <CustomInput
                  label="State"
                  value={state}
                  onChangeText={setState}
                />
              </View>

              {/* City  Dropdown */}
              <View style={styles.customInputContainer}>
                <CustomInput label="City" value={city} onChangeText={setCity} />
              </View>

              {/* Pincode  Dropdown */}
              <View style={styles.customInputContainer}>
                <CustomInput
                  label="Pincode"
                  value={pincode}
                  onChangeText={setPincode}
                />
              </View>

              {/* Address */}
              <View style={{ width: "100%" }}>
                <CustomInput
                  label="Address"
                  value={address}
                  onChangeText={setAddress}
                  multiline={true}
                />
              </View>
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: insets.bottom + 140 }, // ensure content not hidden
          ]}
        />
      </KeyboardAvoidingView>

      {/* Save Button */}
      <View style={[styles.footer, { bottom: insets.bottom }]}>
        <CustomButton
          onPress={() => {
            validateAndSubmit();
          }}
          title={"Register"}
          style={styles.footerButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  scrollContainer: { padding: 16 },
  customInputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
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
  footerButton: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: "#2196F3",
  },
});

export default RequestTrialScreen;
