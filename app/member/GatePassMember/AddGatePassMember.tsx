import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import { useRouter, Stack } from "expo-router";
import { useSociety } from "@/utils/SocietyContext";
import { useAuthRole } from "@/lib/authRole";
import CustomInput from "@/components/CustomInput";
import CustomButton from "@/components/CustomButton";
import Dropdown from "@/utils/DropDown";
import CircularImagePicker from "@/components/CircularImagePicker";
import PaymentDatePicker from "@/utils/paymentDate";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { uploadViaApi, fetchSignedUrl } from "@/utils/imagekitUtils";

const AddGatePassMember = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { societyName } = useSociety();
  const societyContext = useSociety();
  const { userName } = useAuthRole();
  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  );
  const [name, setName] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState<string>("");
  const [visitorType, setVisitorType] = useState<string>("");
  const [visitPurpose, setVisitPurpose] = useState<string>("");
  const [numberOfPerson, setNumberOfPerson] = useState<string>("1");
  const [address, setAddress] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [validFromDate, setValidFromDate] = useState<Date>(new Date());
  const [validToDate, setValidToDate] = useState<Date>(new Date());

  // Determine params based on source

  const wing = societyContext.wing;
  const flatNumber = societyContext.flatNumber;
  const floorName = societyContext.floorName;

  // const customStaffCollectionName = `staff_${societyName}`;
  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;

  const customGatePassCollectionName = `gatePass_${societyName}`;

  const visitorTypes = [
    "Visitor",
    "Electrician",
    "Plumber",
    "Carpenter",
    "Fabricator",
    "Urban Clap",
    "Guest",
    "Daily Helper",
    "Delivery",
    "Staff",
    "School Bus",
    "Swiggy",
    "Flipkart",
    "Amazon",
    "Zomato",
    "Other",
  ];

  const visitorPurpose = [
    "Personal Work",
    "Office Work",
    "Family Gathering",
    "Society Work",
    "Repairing Work",
    "Business Meeting",
    "Delivery",
    "Other",
  ];

  const generateRandomNumber = () => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString(); // 10-digit number
  };

  const formatDate = (date: Date) => {
    return date
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(",", ""); // Removes comma for cleaner formatting
  };

  const handleUpload = async (): Promise<{
    selectedImageUrl: string | null;
  }> => {
    if (!selectedImage) {
      console.warn("Error", "No image selected for upload.");
      return { selectedImageUrl: null };
    }

    let selectedImageUrl: string | null = null;

    try {
      // generate unique image name
      const folderName = "/visitors/";
      const imageName = `${name.replace(/\s+/g, "_")}-${Date.now()}.jpg`;
      const { filePath } = await uploadViaApi(
        selectedImage,
        folderName,
        imageName
      );

      if (filePath) {
        console.log("Image uploaded successfully:", filePath);
        // selectedImageUrl = filePath;
        // Get signed URL (valid for default expiry or permanent if no expireSeconds)
        const { url: signedUrl } = await fetchSignedUrl(filePath);

        // Save this signed URL in Firestore instead of raw filePath
        selectedImageUrl = signedUrl;
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      Alert.alert("Error", error.message || "Failed to upload image.");
    }

    return { selectedImageUrl };
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // ✅ Check if required fields are filled
      if (!name.trim()) {
        Alert.alert("Validation Error", "Please enter the visitor's name.");
        return;
      }
      if (!mobileNumber.trim()) {
        Alert.alert("Validation Error", "Please enter a mobile number.");
        return;
      }
      if (!visitorType) {
        Alert.alert("Validation Error", "Please select a visitor type.");
        return;
      }

      // ✅ Wait for handleUpload and get the uploaded image URLs
      const { selectedImageUrl } = await handleUpload();

      // Construct Firestore references
      const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
      const flatDocRef = doc(db, flatRef);

      const gatePassCollectionRef = collection(
        flatDocRef,
        customGatePassCollectionName
      );

      // Get formated date
      const validFromDateFormated = formatDate(validFromDate); // Example: "11 Dec 2025"
      const validToDateFormated = formatDate(validToDate); // Example: "11 Dec 2025"

      const uniqueId = generateRandomNumber();

      // ✅ Construct the Firestore document with necessary fields
      const visitorData: Record<string, any> = {
        name,
        mobileNumber,
        visitorType,
        visitPurpose,
        address,
        numberOfPerson,
        validFromDate,
        validFromDateFormated,
        validToDate,
        validToDateFormated,
        createdBy: userName,
        visitingTo: `${wing} ${flatNumber}`,
        uniqueId,
      };

      // ✅ Conditionally add images only if they are not null
      if (selectedImageUrl) visitorData.selectedImageUrl = selectedImageUrl;

      // ✅ Conditionally add images only if they are not null
      if (selectedImageUrl) visitorData.selectedImageUrl = selectedImageUrl;

      // ✅ Use uniqueId as the document ID
      const visitorDocRef = doc(gatePassCollectionRef, uniqueId.toString());

      await setDoc(visitorDocRef, visitorData);

      // Show success alert and navigate back
      Alert.alert("Success", "Gate Pass saved successfully!", [
        {
          text: "OK",
          onPress: () =>
            router.replace({
              pathname: "./",
              params: {},
            }), // Navigate to index screen in the same folder
        },
      ]);
    } catch (error) {
      console.error("Error saving Documents:", error);
      Alert.alert("Error", "Failed to save Visitor. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFromDateChange = (newDate: Date) => {
    setValidFromDate(newDate);
  };

  const handleToDateChange = (newDate: Date) => {
    setValidToDate(newDate);
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
        <AppbarComponent title="Create Gate Pass" />
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

            {/* Name */}
            <View style={styles.customInputContainer}>
              <CustomInput label="Name" value={name} onChangeText={setName} />
            </View>
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

          {/* Visitor Type */}
          <View style={styles.section}>
            <Text style={styles.label}>Type</Text>
            <Dropdown
              data={visitorTypes.map((option) => ({
                label: option,
                value: option,
              }))}
              onChange={(selectedValue) => {
                setVisitorType(selectedValue);
              }}
              placeholder="Select Type"
              initialValue={visitorType}
            />
          </View>
          {/* Date Inputs */}
          <View style={styles.dateInputsContainer}>
            {/* Valid From Date */}
            <View style={styles.fromDateSection}>
              <Text style={styles.datelabel}>Valid From</Text>
              <PaymentDatePicker
                initialDate={validFromDate}
                onDateChange={handleFromDateChange}
                minimumDate={new Date()}
              />
            </View>
            {/* Valid To Date */}
            <View style={styles.toDateSection}>
              <Text style={styles.datelabel}>Valid To</Text>
              <PaymentDatePicker
                initialDate={validToDate}
                onDateChange={handleToDateChange}
                minimumDate={new Date()}
              />
            </View>
          </View>
          {/* Visitor Purpose */}
          <View style={styles.section}>
            <Text style={styles.label}>Purpose (Optional)</Text>
            <Dropdown
              data={visitorPurpose.map((option) => ({
                label: option,
                value: option,
              }))}
              onChange={(selectedValue) => {
                setVisitPurpose(selectedValue);
              }}
              placeholder="Select Purpose"
              initialValue={visitPurpose}
            />
          </View>
          {/* Number Of Person */}
          <View style={styles.customInputContainer}>
            <CustomInput
              label="Number Of Persons (optional)"
              value={numberOfPerson}
              onChangeText={setNumberOfPerson}
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
        </ScrollView>
        <View style={{ minHeight: 80 }}></View>
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
            onPress={handleSave}
            title="Save"
            style={{ backgroundColor: "#2196F3" }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AddGatePassMember;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContainer: { padding: 16 },
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
  section: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  dateInputsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 50,
  },
  toDateSection: { flex: 1, marginLeft: 10, marginBottom: 16 },
  fromDateSection: { flex: 1, marginRight: 10, marginBottom: 16 },
  datelabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
  },
});
