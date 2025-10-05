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
import React, { useState } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import { useRouter, Stack } from "expo-router";
import { useSociety } from "@/utils/SocietyContext";
import CircularImagePicker from "@/components/CircularImagePicker";
import CustomInput from "@/components/CustomInput";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Dropdown from "@/utils/DropDown";
import CustomButton from "@/components/CustomButton";
import { IconButton } from "react-native-paper";
import { collection, doc, addDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useAuthRole } from "@/lib/authRole";
import GetUserToken from "@/utils/GetUserToken"; // Import the function
import UploaFiles from "@/utils/UploaFiles"; // Import the function

const SocietyWorkVisitor = () => {
  const router = useRouter();
  const { societyName } = useSociety();

  const { userName } = useAuthRole();

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

  const customVisitorCollectionName = `visitor_${societyName}`;

  const [username, setUsername] = useState("mahesh.c.pathak@gmail.com");
  const [password, setPassword] = useState("@Usha2025$");

  const visitorTypes = [
    "Cleaning",
    "Electrician",
    "Gardner",
    "Guest",
    "Plumbing",
    "Staff",
    "Other",
  ];

  const visitorPurpose = ["Society Work", "Other"];

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
    const result = await GetUserToken(username, password);

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
      // Construct Firestore references
      const societyRef = `Societies/${societyName}`;
      const societyDocRef = doc(db, societyRef);
      const visitorCollectionRef = collection(
        societyDocRef,
        customVisitorCollectionName
      );

      // Get current date and time
      const currentDate = new Date();
      const formattedDateTime = formatDateTime(currentDate); // Example: "11 Dec 9:18 pm"
      // ✅ Construct the Firestore document with necessary fields
      const visitorData: Record<string, any> = {
        name,
        mobileNumber,
        visitorType,
        visitPurpose,
        address,
        numberOfPerson,
        vehicles,
        createdAt: currentDate,
        formattedDateTime,
        createdBy: userName,
        visitorStatus: "CheckedIn",
      };

      // ✅ Conditionally add images only if they are not null
      if (selectedImageUrl) visitorData.selectedImageUrl = selectedImageUrl;

      // Add document to Firestore
      await addDoc(visitorCollectionRef, visitorData);

      // Show success alert and navigate back
      Alert.alert("Success", "Visitor Data saved successfully!", [
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
      <AppbarComponent title="Add Society work Visitor" source="Admin" />
      <ScrollView style={styles.scrollContainer}>
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
      <View style={{ minHeight: 80 }}></View>
      {/* Save Button */}
      <CustomButton onPress={handleSave} title="Save" />
    </View>
  );
};

export default SocietyWorkVisitor;

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
});
