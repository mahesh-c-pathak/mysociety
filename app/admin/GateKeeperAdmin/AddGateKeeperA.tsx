import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useSociety } from "@/utils/SocietyContext";
import CustomInput from "@/components/CustomInput";
import CustomButton from "@/components/CustomButton";

import CircularImagePicker from "@/components/CircularImagePicker";

import GetUserToken from "@/utils/GetUserToken"; // Import the function
import UploaFiles from "@/utils/UploaFiles"; // Import the function

const AddGateKeeperA = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { societyName } = useSociety();

  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  );
  const [firstName, setfirstName] = useState<string>("");
  const [lastName, setlastName] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [loading, setLoading] = useState(false);

  const { item } = useLocalSearchParams();
  // Parse the passed item
  const profileDataItem = item ? JSON.parse(item as string) : {};
  const docId = profileDataItem.id;

  const isEditMode = !!docId;
  const password = "Password";

  const apiUserName = process.env.EXPO_PUBLIC_API_USERNAME;
  const apiPassword = process.env.EXPO_PUBLIC_API_PASSWORD;

  const handleUpload = async (): Promise<{
    selectedImageUrl: string | null;
  }> => {
    if (!apiUserName || !apiPassword) {
      console.log("Error: apiUserName or apiPassword is not defined.");
      return { selectedImageUrl: null };
    }

    const result = await GetUserToken(apiUserName, apiPassword);

    if ("userToken" in result) {
      const userToken = `${result.userToken}`;

      if (!selectedImage) {
        console.warn("Error", "No image selected for upload.");
        return { selectedImageUrl: null };
      }

      let selectedImageUrl: string | null = null;

      // Upload selectedImage if it exists and is different from profileDataItem.selectedImageUrl
      if (selectedImage) {
        const extension = selectedImage.split(".").pop() || "jpg";
        const imageName = `selected_${Date.now()}.${extension}`;

        const uploadResult = await UploaFiles(
          selectedImage,
          imageName,
          `image/${extension}`,
          userToken
        );

        if (typeof uploadResult === "string") {
          console.log("Selected image uploaded successfully:", uploadResult);
          selectedImageUrl = uploadResult;
        } else if ("error" in uploadResult) {
          console.error("Error:", uploadResult.error);
          Alert.alert("Error", uploadResult.error);
        }
      }

      return { selectedImageUrl }; // ✅ Only returning selectedImageUrl
    } else if ("error" in result) {
      console.error(`Error in getting UserToken: ${result.error}`);
      return { selectedImageUrl: null };
    }

    return { selectedImageUrl: null }; // ✅ Fallback return
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // ✅ Check if required fields are filled
      if (!firstName.trim()) {
        Alert.alert("Validation Error", "Please enter the firstName.");
        return;
      }
      if (!lastName.trim()) {
        Alert.alert("Validation Error", "Please enter the lastName.");
        return;
      }
      if (!mobileNumber.trim()) {
        Alert.alert("Validation Error", "Please enter a mobile number.");
        return;
      }

      if (!email.trim()) {
        Alert.alert("Validation Error", "Please enter a email.");
        return;
      }

      // ✅ Wait for handleUpload and get the uploaded image URLs
      let selectedImageUrl = profileDataItem?.selectedImageUrl || null;

      // ✅ Only call handleUpload if profileDataItem.selectedImageUrl is not available
      if (!selectedImageUrl) {
        const uploadResult = await handleUpload();
        selectedImageUrl = uploadResult.selectedImageUrl;
      }

      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      let userId;
      //let isNewUser = false;

      if (!querySnapshot.empty) {
        // User exists, get user document
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        userId = userDoc.id;

        let updatedSocieties = userData.mySociety || [];

        // Find if the society exists in user's mySociety array
        const societyIndex = updatedSocieties.findIndex(
          (societyObj: any) => Object.keys(societyObj)[0] === societyName
        );

        if (societyIndex !== -1) {
          // Society exists, check if GateKeeper role is already present
          const societyDetails = updatedSocieties[societyIndex][societyName];
          if (!societyDetails.memberRole.includes("GateKeeper")) {
            societyDetails.memberRole.push("GateKeeper");
          }
        } else {
          // Society does not exist, add new society with GateKeeper role
          updatedSocieties.push({
            [societyName]: {
              memberRole: ["GateKeeper"],
              flatDetails: null,
            },
          });
        }

        // Update ONLY the `mySociety` field in Firestore
        await updateDoc(doc(db, "users", userId), {
          mySociety: updatedSocieties,
        });

        console.log(`User's society role updated in: ${societyName}`);
      } else {
        // User does not exist, create a new user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;
        userId = user.uid;
        //isNewUser = true;
        const displayName = `${firstName} ${lastName}`;

        // Create new user object dynamically
        let newUserData: any = {
          firstName,
          lastName,
          displayName,
          email,
          mobileNumber,
          approved: true,
          mySociety: [
            {
              [societyName]: {
                memberRole: ["GateKeeper"],
              },
            },
          ],
          createdAt: new Date(),
        };

        // ✅ Conditionally add `selectedImageUrl` if it exists
        if (selectedImageUrl) {
          newUserData.selectedImageUrl = selectedImageUrl;
        }

        // Create new user document in Firestore
        await setDoc(doc(db, "users", user.uid), newUserData);

        console.log(`New user created and added to society: ${societyName}`);
      }

      // ✅ Step 2: Update the gateKeepers array in the Societies collection
      if (userId) {
        const societyRef = doc(db, "Societies", societyName);
        const societyDoc = await getDoc(societyRef);

        let gateKeepers = [];
        if (societyDoc.exists()) {
          const societyData = societyDoc.data();
          gateKeepers = societyData.gateKeepers || [];
        }

        // ✅ Create new GateKeeper entry as an object with userId as key
        const newGateKeeperEntry = {
          [userId]: {
            displayName: `${firstName} ${lastName}`,
            mobileNumber,
            ...(selectedImageUrl ? { selectedImageUrl } : {}), // ✅ Conditionally add image URL
          },
        };

        // ✅ Check if userId already exists in gateKeepers
        const existingEntryIndex = gateKeepers.findIndex((entry: any) =>
          entry.hasOwnProperty(userId)
        );

        if (existingEntryIndex !== -1) {
          // ✅ Update existing entry
          gateKeepers[existingEntryIndex] = newGateKeeperEntry;
        } else {
          // ✅ Add new entry
          gateKeepers.push(newGateKeeperEntry);
        }

        // ✅ Update Firestore document with modified gateKeepers array
        await updateDoc(societyRef, { gateKeepers });

        console.log(
          `GateKeeper added/updated in society: ${firstName} ${lastName}`
        );
        // Show success alert and navigate back
        Alert.alert("Success", "GateKeeper data saved successfully!", [
          {
            text: "OK",
            onPress: () =>
              router.push({
                pathname: `/admin/GateKeeperAdmin`,
                params: {},
              }), // Navigate to index screen in the previous folder
          },
        ]);
      }
    } catch (error) {
      console.error("Error updating GateKeeper profile:", error);
      Alert.alert(
        "Error",
        "Failed to update GateKeeper profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {};

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
      <AppbarComponent title="Add GateKeeper" source="Admin" />
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.row}>
          {/* Circular Image Picker with Custom Styles */}
          <CircularImagePicker
            onImageSelected={(imageUri) => setSelectedImage(imageUri)}
            buttonStyle={styles.customButton}
            imageStyle={styles.customImage}
            iconSize={40}
            iconColor="black"
            initialImage={selectedImage} // Pass the initial image URL
          />

          {/* First Name */}
          <View style={styles.customInputContainer}>
            <CustomInput
              label="First Name"
              value={firstName}
              onChangeText={setfirstName}
            />
          </View>
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
        <View style={styles.customInputContainer}>
          <CustomInput
            label="Mobile Number"
            value={mobileNumber}
            onChangeText={setMobileNumber}
          />
        </View>

        {/* Email */}
        <View style={styles.customInputContainer}>
          <CustomInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
        </View>
        {/* Notes */}
        <View style={styles.customInputContainer}>
          <CustomInput
            label="Notes (Optional)"
            value={note}
            onChangeText={setNote}
            multiline={true}
          />
        </View>
        <View style={{ minHeight: 70 }}></View>
      </ScrollView>
      {/* Save Button */}
      <View style={[styles.footer, { bottom: insets.bottom }]}>
        <CustomButton
          onPress={isEditMode ? handleUpdate : handleSave}
          title={isEditMode ? "Update" : "Save"}
        />
      </View>
    </View>
  );
};

export default AddGateKeeperA;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContainer: { padding: 20 },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  customButton: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: "#ccc", // Custom button color
    borderWidth: 1,
  },
  customImage: {
    borderRadius: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "center", // Ensures proper alignment
    gap: 16, // Provides spacing between elements without forcing them apart
  },
  customInputContainer: {
    flex: 1, // Takes up remaining space without overflowing
    marginBottom: 16,
  },
  label: {
    marginBottom: 5,
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
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
