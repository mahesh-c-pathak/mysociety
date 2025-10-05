import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";

import { collection, doc, addDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";
import CustomInput from "@/components/CustomInput";
import CustomButton from "@/components/CustomButton";
import DropdownMultiSelect from "@/utils/DropdownMultiSelect";
import * as ImagePicker from "expo-image-picker";

import CircularImagePicker from "@/components/CircularImagePicker";

import { useAuthRole } from "@/lib/authRole";
import { uploadViaApi, fetchSignedUrl } from "@/utils/imagekitUtils";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";

const AddAdminStaff = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { societyName } = useSociety();
  const { userName } = useAuthRole();

  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  );
  const [firstName, setfirstName] = useState<string>("");
  const [lastName, setlastName] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState<string>("");

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [address, setAddress] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [idcardImage, setIcardImage] = useState<string | null>(null);

  const customStaffCollectionName = `staff_${societyName}`;
  const [loading, setLoading] = useState(false);

  const { item } = useLocalSearchParams();
  // Parse the passed item
  const profileDataItem = item ? JSON.parse(item as string) : {};
  const docId = profileDataItem.id;

  const isEditMode = !!docId;

  const services = [
    "Babysitter",
    "Body Massage Trainer",
    "CCTV Executive",
    "Civil Work Executive",
    "Cleaning",
    "Cook/Chef",
    "DG Executive",
    "Driver",
    "Electrical Executive",
    "Elevator Executive",
    "Fabrication Executive",
    "Garba Trainer",
    "Gardner",
    "Gym Trainer",
    "House Keeping",
    "Intercom Executive",
    "Laundry Service",
    "Maid",
    "Milk Man",
    "Plumbing Executive",
    "Salon Executive",
    "Security",
    "Society Manager",
    "Solar Panel Executive",
    "Sweeper",
    "Tiffin Service",
    "Tuition Teacher",
    "Yoga Trainer",
    "Other",
  ];

  const handleSelectionChange = (selectedValues: string[]) => {
    setSelectedServices(selectedValues);
  };

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need camera roll permissions to make this work!");
      return;
    }

    // Open image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    // Set selected image if not cancelled
    if (!result.canceled) {
      setIcardImage(result.assets[0].uri);
    }
  };

  const handleUpload = async (): Promise<{
    selectedImageUrl: string | null;
    idcardImageUrl: string | null;
  }> => {
    if (!selectedImage && !idcardImage) {
      console.warn("Error", "No images selected for upload.");
      return { selectedImageUrl: null, idcardImageUrl: null };
    }

    let selectedImageUrl: string | null = null;
    let idcardImageUrl: string | null = null;

    try {
      // ✅ Upload profile image if changed
      if (selectedImage && selectedImage !== profileDataItem.selectedImageUrl) {
        const folderName = "/dailyhelper/";
        const imageName = `profile-${Date.now()}.jpg`;

        const { filePath } = await uploadViaApi(
          selectedImage,
          folderName,
          imageName
        );

        if (filePath) {
          const { url: signedUrl } = await fetchSignedUrl(filePath);
          selectedImageUrl = signedUrl;
        }
      }

      // ✅ Upload ID card image if changed
      if (idcardImage && idcardImage !== profileDataItem.idcardImageUrl) {
        const folderName = "/dailyhelper/";
        const imageName = `idcard-${Date.now()}.jpg`;

        const { filePath } = await uploadViaApi(
          idcardImage,
          folderName,
          imageName
        );

        if (filePath) {
          const { url: signedUrl } = await fetchSignedUrl(filePath);
          idcardImageUrl = signedUrl;
        }
      }
    } catch (error: any) {
      console.error("Error uploading images:", error);
      Alert.alert("Error", error.message || "Failed to upload images.");
    }

    return { selectedImageUrl, idcardImageUrl };
  };

  useEffect(() => {
    if (isEditMode) {
      setSelectedImage(profileDataItem.selectedImageUrl);
      setfirstName(profileDataItem.firstName);
      setlastName(profileDataItem.lastName);
      setMobileNumber(profileDataItem.mobileNumber);
      setEmail(profileDataItem.email);
      setSelectedServices(profileDataItem.selectedServices);
      setAddress(profileDataItem.address);
      setNote(profileDataItem.note);
      setIcardImage(profileDataItem.idcardImageUrl);
    }
  }, [isEditMode]);

  const handleSave = async () => {
    setLoading(true);
    try {
      console.log("handleSave Pressed");

      // ✅ Wait for handleUpload and get the uploaded image URLs
      const { selectedImageUrl, idcardImageUrl } = await handleUpload();
      console.log("Uploaded Images:", { selectedImageUrl, idcardImageUrl });

      // Construct Firestore references
      const societyRef = `Societies/${societyName}`;
      const societyDocRef = doc(db, societyRef);
      const documentCollectionRef = collection(
        societyDocRef,
        customStaffCollectionName
      );

      // ✅ Construct the Firestore document with necessary fields
      const staffData: Record<string, any> = {
        firstName,
        lastName,
        mobileNumber,
        email,
        selectedServices,
        address,
        note,
        createdAt: new Date(),
        createdBy: userName,
      };

      // ✅ Conditionally add images only if they are not null
      if (selectedImageUrl) staffData.selectedImageUrl = selectedImageUrl;
      if (idcardImageUrl) staffData.idcardImageUrl = idcardImageUrl;

      // Add document to Firestore
      await addDoc(documentCollectionRef, staffData);

      // Show success alert and navigate back
      Alert.alert("Success", "Documents saved successfully!", [
        {
          text: "OK",
          onPress: () =>
            router.push({
              pathname: "./",
              params: {},
            }), // Navigate to index screen in the same folder
        },
      ]);
    } catch (error) {
      console.error("Error saving Documents:", error);
      Alert.alert("Error", "Failed to save Documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!docId) {
      Alert.alert("Error", "Document ID is missing. Cannot update.");
      return;
    }

    setLoading(true);
    try {
      console.log("handleUpdate Pressed");

      const updatedFields: Record<string, any> = {};

      if (firstName !== profileDataItem.firstName)
        updatedFields.firstName = firstName;
      if (lastName !== profileDataItem.lastName)
        updatedFields.lastName = lastName;
      if (mobileNumber !== profileDataItem.mobileNumber)
        updatedFields.mobileNumber = mobileNumber;
      if (email !== profileDataItem.email) updatedFields.email = email;
      if (
        JSON.stringify(selectedServices) !==
        JSON.stringify(profileDataItem.selectedServices)
      ) {
        updatedFields.selectedServices = selectedServices;
      }
      if (address !== profileDataItem.address) updatedFields.address = address;
      if (note !== profileDataItem.note) updatedFields.note = note;

      let newSelectedImageUrl = profileDataItem.selectedImageUrl;
      let newIdCardImageUrl = profileDataItem.idcardImageUrl;

      const isImageChanged =
        selectedImage && selectedImage !== profileDataItem.selectedImageUrl;
      const isIdCardChanged =
        idcardImage && idcardImage !== profileDataItem.idcardImageUrl;

      if (isImageChanged || isIdCardChanged) {
        const uploadResult = await handleUpload();

        if (isImageChanged && uploadResult.selectedImageUrl) {
          newSelectedImageUrl = uploadResult.selectedImageUrl;
          updatedFields.selectedImageUrl = newSelectedImageUrl;
        }

        if (isIdCardChanged && uploadResult.idcardImageUrl) {
          newIdCardImageUrl = uploadResult.idcardImageUrl;
          updatedFields.idcardImageUrl = newIdCardImageUrl;
        }
      }

      if (Object.keys(updatedFields).length === 0) {
        Alert.alert("No Changes", "No updates were made.");
        setLoading(false);
        return;
      }

      const societyRef = `Societies/${societyName}`;
      const societyDocRef = doc(db, societyRef);
      const staffDocRef = doc(societyDocRef, customStaffCollectionName, docId);

      await updateDoc(staffDocRef, updatedFields);

      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.push("./") },
      ]);
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppbarComponent title="Add Staff" source="Admin" />
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100, // 👈 add enough gap for footer + FAB
          }}
        >
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

          {/* Select Services */}
          <View style={styles.section}>
            <Text style={styles.label}>Services</Text>

            <DropdownMultiSelect
              options={services.map((serviceName) => ({
                label: serviceName,
                value: serviceName,
              }))}
              selectedValues={selectedServices}
              onChange={handleSelectionChange}
              placeholder="Select"
            />
          </View>

          {/* Address */}
          <View style={styles.customInputContainer}>
            <CustomInput
              label="Address (Optional)"
              value={address}
              onChangeText={setAddress}
              multiline={true}
            />
          </View>

          {/* Choose ID Card  */}

          {/* Display the selected image outside if needed */}
          <View style={{ alignItems: "center" }}>
            {idcardImage && (
              <Image
                source={{ uri: idcardImage }}
                style={styles.previewImage}
              />
            )}

            <TouchableOpacity
              style={styles.buttonAttachment}
              onPress={pickImage}
            >
              <Text style={styles.buttonAttachmentText}>
                Choose ID Card (Optional)
              </Text>
            </TouchableOpacity>
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
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#fff", // 👈 fills the safe area
            paddingBottom: insets.bottom, // ensures button floats above
          }}
        >
          <CustomButton
            onPress={isEditMode ? handleUpdate : handleSave}
            title={isEditMode ? "Update" : "Save"}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AddAdminStaff;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContainer: { padding: 20 },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#6200ee",
  },
  loader: { marginTop: 20 },
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
  section: { marginBottom: 10 },
  buttonAttachment: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 2,
    minWidth: 60,
    alignItems: "center",
    backgroundColor: "#6200ee", // Orange for No
  },
  buttonAttachmentText: {
    fontWeight: "bold",
    color: "#fff",
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 2,
    marginBottom: 16,
  },
});
