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
import { Appbar } from "react-native-paper";
import { useRouter } from "expo-router";
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";

import {
  doc,
  setDoc,
  collection,
  updateDoc,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthRole } from "@/lib/authRole";
import {
  addSocietyWithLedgerGroups,
  addPredefinedAccountsWithBalances,
} from "@/utils/SetupWIngs/setUpLedger";

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
     

  const [loading, setLoading] = useState<boolean>(false);

  const generateUniqueSocietyCode = async () => {
    const societiesRef = collection(db, "Societies");
    let uniqueCode;
    let exists = true;

    while (exists) {
      uniqueCode = Math.floor(1000 + Math.random() * 9000).toString(); // Generate 4-digit code
      const querySnapshot = await getDoc(doc(societiesRef, uniqueCode));
      exists = querySnapshot.exists(); // Check if society with this code exists
    }

    return uniqueCode;
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

      // Create society-level document
      await setDoc(societyDocRef, {
        name: societyName,
        totalWings: Number(totalWings),
        state,
        city,
        pincode,
        address,
        societycode: societyCode,
      });

      // Initialize wing structure
      for (let i = 1; i <= Number(totalWings); i++) {
        const wingLetter = String.fromCharCode(64 + i); // Convert 1 -> A, 2 -> B, etc
        const wingName = wingLetter; // "Wing A", "Wing B", etc.
        const customWingsSubcollectionName = `${societyName} wings`;
        const wingRef = doc(
          collection(societyDocRef, customWingsSubcollectionName),
          wingName
        );

        await setDoc(wingRef, {
          totalFloors: 0,
          unitsPerFloor: 0,
          format: "",
        });
      }

      // Assign Admin role
      assignAdminRole(user!.uid, societyName);

      // add Society LedgerGroups
      await addSocietyWithLedgerGroups(societyName);

      //
      await addPredefinedAccountsWithBalances(societyName);

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
    
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0} // offset for header height
      style={styles.container}
    >

      
        {/* Top Appbar */}
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => router.back()} color="#fff" />
          <Appbar.Content
            title="Request a Trial"
            titleStyle={styles.titleStyle}
          />
        </Appbar.Header>

        <FlatList
          data={[{}]} // Use a single-item list to render your UI
          renderItem={() => (
            <>
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
              <View style={{ minHeight: 48 }}></View>
            </>
          )}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: 140}, // ensure content not hidden
          ]}
        />

        {/* Save Button */}
        <View
        style={[
          styles.footer,
          { bottom: insets.bottom },
        ]}
      >
        <CustomButton
          onPress={() => {
            validateAndSubmit();
          }}
          title={"Register"}
          style={styles.footerButton}
        />
        </View>
      
    </KeyboardAvoidingView>
   
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
  header: { backgroundColor: "#2196F3" },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
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
  input: {
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 16,
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
footerButton: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: "#2196F3" 
  },
  
});

export default RequestTrialScreen;

 
