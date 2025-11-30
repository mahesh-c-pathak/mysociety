import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { useSociety } from "@/utils/SocietyContext";
import CircularImagePicker from "@/components/CircularImagePicker";
import CustomInput from "@/components/CustomInput";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Dropdown from "@/utils/DropDown";
import CustomButton from "@/components/CustomButton";
import { IconButton } from "react-native-paper";
import { collection, doc, addDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";

import { useAuthRole } from "@/lib/authRole";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { uploadViaApi, fetchSignedUrl } from "@/utils/imagekitUtils";

const AddVisitor = () => {
  const insets = useSafeAreaInsets();
  const { wing, floorName, flatNumber, item } = useLocalSearchParams();
  const router = useRouter();
  const { societyName } = useSociety();

  const { user } = useAuthRole();
  // Parse the passed item
  const profileItem = item ? JSON.parse(item as string) : {};

  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  );
  const [name, setName] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [visitorType, setVisitorType] = useState<string>("");
  const [visitPurpose, setVisitPurpose] = useState<string>("");
  const [numberOfPerson, setNumberOfPerson] = useState<string>("1");
  const [address, setAddress] = useState<string>("");

  const [loading, setLoading] = useState(false);

  // const customStaffCollectionName = `staff_${societyName}`;
  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;

  // const customVisitorCollectionName = `visitor_${societyName}`;
  const customVisitorCollectionName = "visitor";

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

  const vehicleTypes = ["Bike", "Car", "Rickshaw", "Scooter", "Tempo", "Truck"];

  const [vehicles, setVehicles] = useState([{ id: 1, type: "", number: "" }]);

  const addVehicle = () => {
    setVehicles([...vehicles, { id: Date.now(), type: "", number: "" }]);
  };

  const removeVehicle = (id: number) => {
    if (vehicles.length > 1) {
      setVehicles(vehicles.filter((vehicle) => vehicle.id !== id));
    }
  };

  const updateVehicle = (
    id: number,
    field: "type" | "number",
    value: string
  ) => {
    setVehicles(
      vehicles.map((vehicle) =>
        vehicle.id === id ? { ...vehicle, [field]: value } : vehicle
      )
    );
  };

  const formatDateTime = (date: Date) => {
    return date
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", "");
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
      let selectedImageUrl = profileItem?.selectedImageUrl || null;

      // ✅ Only call handleUpload if profileItem.selectedImageUrl is not available
      if (!selectedImageUrl) {
        const uploadResult = await handleUpload();
        selectedImageUrl = uploadResult.selectedImageUrl;
      }

      // Construct Firestore references
      const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
      const flatDocRef = doc(db, flatRef);

      const visitorCollectionRef = collection(
        flatDocRef,
        customVisitorCollectionName
      );
      // Get current date and time
      const currentDate = new Date();
      const formattedDateTime = formatDateTime(currentDate); // Example: "11 Dec 9:18 pm"
      // ✅ Construct the Firestore document with necessary fields
      const visitorData: Record<string, any> = {
        societyName,
        name,
        mobileNumber,
        visitorType,
        visitPurpose,
        address,
        numberOfPerson,
        vehicles,
        createdAt: currentDate,
        formattedDateTime,
        createdBy: user?.displayName,
        visitorStatus: "Pending",
        visitingTo: `${wing} ${flatNumber}`,
      };

      // ✅ Conditionally add images only if they are not null
      if (selectedImageUrl) visitorData.selectedImageUrl = selectedImageUrl;

      // ✅ Conditionally add `uniqueId` if `profileItem` exists
      if (item) {
        visitorData.uniqueId = profileItem.uniqueId; // Assuming `profileItem` contains `uniqueId`
      }

      // Add document to Firestore
      const docRef = await addDoc(visitorCollectionRef, visitorData);

      // 🔹 Notify resident
      await notifyResident(flatNumber as string, docRef.id, visitorData.name);

      // Show success alert and navigate back
      Alert.alert("Success", "Visitor added and resident notified", [
        {
          text: "OK",
          onPress: () =>
            router.push({
              pathname: `/GateKeeper`,
              params: {},
            }), // Navigate to index screen in the previous folder
        },
      ]);
    } catch (error) {
      console.error("Error saving Documents:", error);
      Alert.alert("Error", "Failed to save Visitor. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Function to send push notification to resident (batched)
  async function notifyResident(
    flatNumber: string,
    visitorDocId: string,
    visitorName: string
  ) {
    try {
      // Construct Firestore references
      const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
      const flatDocRef = doc(db, flatRef);

      const flatSnap = await getDoc(flatDocRef);
      if (!flatSnap.exists()) return;

      const userDetails = flatSnap.data().userDetails || {};

      // collect all tokens from all residents of the flat
      let allTokens: string[] = [];
      for (const uuid in userDetails) {
        console.log("uuid in userDetails ", uuid);
        const resident = userDetails[uuid];
        const tokens: string[] = resident.expoPushTokens || [];
        allTokens = [...allTokens, ...tokens];
      }

      // remove duplicates
      allTokens = [...new Set(allTokens)];

      if (allTokens.length === 0) {
        console.log("No expo tokens found for this flat ❌");
        return;
      }

      // prepare messages
      const messages = allTokens.map((token) => ({
        to: token,
        sound: "default",
        title: "Visitor Approval Needed",
        body: `${visitorName} is at the gate. Approve entry?`,
        data: {
          type: "visitor_approval",
          visitorId: visitorDocId,
          flatNumber,
          wing,
          floorName,
          societyName,
        },
      }));

      // send all messages in a single request
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages), // ✅ send array
      });

      const result = await response.json();
      console.log("Expo push response:", result);
    } catch (err) {
      console.error("Error notifying resident:", err);
    }
  }

  useEffect(() => {
    if (item) {
      setName(profileItem.name || "");
      setMobileNumber(profileItem.mobileNumber || "");
      setVisitorType(profileItem.visitorType || "");
      setVisitPurpose(profileItem.visitPurpose || "");
      setNumberOfPerson(profileItem.numberOfPerson || "1");
      setAddress(profileItem.address || "");
      setSelectedImage(profileItem.selectedImageUrl || undefined);
    }
  }, [item]);

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
      <AppbarComponent title="Add Visitor" source="Admin" />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        <View style={styles.cardview}>
          <Text style={styles.label}>
            {wing} {flatNumber}
          </Text>
        </View>
        <View style={styles.cardview}>
          <View style={styles.camerarow}>
            {/* Circular Image Picker with Custom Styles */}
            <CircularImagePicker
              onImageSelected={(imageUri) => setSelectedImage(imageUri)}
              buttonStyle={styles.customButton}
              imageStyle={styles.customImage}
              iconSize={40}
              iconColor="black"
              initialImage={selectedImage} // Pass the initial image URL
            />

            <View
              style={{
                backgroundColor: "#000",
                padding: 5,
                borderRadius: 2,
                alignSelf: "flex-start", // Adjust width based on content
              }}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Choose Image
              </Text>
            </View>
          </View>
          {/* Name / Microphone row */}
          <View style={styles.inputrow}>
            {/* Name */}
            <View style={styles.customInputContainer}>
              <CustomInput label="Name" value={name} onChangeText={setName} />
            </View>
            {/* Microphone */}
            <TouchableOpacity style={styles.microphoneview}>
              <FontAwesome name="microphone" size={28} color="black" />
            </TouchableOpacity>
          </View>
          {/* Contact Number / Microphone row */}
          <View style={styles.inputrow}>
            {/* Name */}
            <View style={styles.customInputContainer}>
              <CustomInput
                label="Contact Number"
                value={mobileNumber}
                onChangeText={setMobileNumber}
              />
            </View>
            {/* Microphone */}
            <TouchableOpacity style={styles.microphoneview}>
              <FontAwesome name="microphone" size={28} color="black" />
            </TouchableOpacity>
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
        </View>
        <View style={styles.cardview}>
          <View style={{ alignSelf: "center" }}>
            <Text style={styles.label}>Vehicle Details (Optional)</Text>
          </View>
          <FlatList
            data={vehicles}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false} // Disables scrolling
            renderItem={({ item, index }) => (
              <View
                style={{
                  marginBottom: 10,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 16, marginRight: 5 }}>
                  {index + 1}
                </Text>

                <View
                  style={{
                    flex: 1,
                    marginRight: 5,
                    minWidth: 16,
                  }}
                >
                  <Dropdown
                    data={vehicleTypes.map((option) => ({
                      label: option,
                      value: option,
                    }))}
                    onChange={(selectedValue) => {
                      updateVehicle(item.id, "type", selectedValue);
                    }}
                    placeholder="Select Type"
                  />
                </View>

                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 5,
                    paddingVertical: 8,
                    marginRight: 5,
                    minHeight: 50,
                  }}
                  placeholder="Number"
                  value={item.number}
                  onChangeText={(text) =>
                    updateVehicle(item.id, "number", text)
                  }
                />

                {vehicles.length > 1 && index !== vehicles.length - 1 && (
                  <IconButton
                    icon="close-circle"
                    iconColor="red"
                    onPress={() => removeVehicle(item.id)}
                    style={{ marginHorizontal: -5 }} // Reduce spacing
                  />
                )}

                {index === vehicles.length - 1 && (
                  <IconButton
                    icon="plus-circle"
                    iconColor="green"
                    onPress={addVehicle}
                    style={{ marginHorizontal: -10 }} // Reduce spacing
                  />
                )}
              </View>
            )}
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { bottom: insets.bottom }]}>
        <CustomButton onPress={handleSave} title="Save" />
      </View>
    </View>
  );
};

export default AddVisitor;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContainer: { padding: 16 },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  section: { marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  cardview: {
    marginBottom: 16,
    padding: 16,
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
  camerarow: {
    flexDirection: "row",
    alignItems: "center", // Ensures proper alignment
    gap: 4, // Provides spacing between elements without forcing them apart
  },
  customInputContainer: {
    flex: 1, // Takes up remaining space without overflowing
    marginBottom: 10,
  },
  inputrow: {
    flexDirection: "row",
    alignItems: "center", // Ensures proper alignment
    gap: 4, // Provides spacing between elements without forcing them apart
  },
  microphoneview: {
    marginLeft: 20,
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
