import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Alert,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";
import { collection, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";
import CustomInput from "@/components/CustomInput";
import CustomButton from "@/components/CustomButton";
import Dropdown from "@/utils/DropDown";
import ActionModal from "@/components/ActionModal";
import AppHeader from "@/components/AppHeader"; // Updated import
import LoadingIndicator from "@/components/LoadingIndicator"; // new import
import {
  pickImage,
  captureImage,
  uploadViaApi,
  fetchSignedUrl,
} from "@/utils/imagekitUtils";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthRole } from "@/lib/authRole";

const AddMyVehicle = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { source, vehicleNumber: existingVehicleNumberParam } =
    useLocalSearchParams();
  const existingVehicleNumber: string =
    existingVehicleNumberParam?.toString() || "";

  const societyContext = useSociety();
  const { societyName } = useSociety();

  const { userName } = useAuthRole();

  const wing = societyContext.wing;
  const flatNumber = societyContext.flatNumber;
  const floorName = societyContext.floorName;

  const vehicleTypess = [
    "Tempo",
    "Truck",
    "Scooter",
    "Rickshaw",
    "Bike",
    "Car",
    "Other",
  ];

  const [modalVisible, setModalVisible] = useState(false);

  const [image, setImage] = useState<string | null>(null);

  const [vehicleNumber, setVehicleNumber] = useState(existingVehicleNumber);
  const [type, setType] = useState("");
  const [parkingAllotment, setParkingAllotment] = useState("");
  const [note, setNote] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  );

  const [originalImage, setOriginalImage] = useState<string | null>(null); // firestore image

  const [loading, setLoading] = useState(false);

  const isEditMode = !!existingVehicleNumber;

  const vehiclesCollectionName = `vehicles_${societyName}`;

  // const customStaffCollectionName = `staff_${societyName}`;
  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;

  // Fetch existing vehicle if editing
  useEffect(() => {
    const fetchVehicle = async () => {
      if (!existingVehicleNumber) return;

      try {
        const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
        const flatDocRef = doc(db, flatRef);
        const vehicleDocRef = doc(
          flatDocRef,
          vehiclesCollectionName,
          existingVehicleNumber
        );
        const docSnap = await getDoc(vehicleDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setType(data.type);
          setParkingAllotment(data.parkingAllotment || "");
          setNote(data.note || "");
          setVehicleNumber(existingVehicleNumber);

          if (data.image) {
            setOriginalImage(data.image); // keep Firestore image
            setSelectedImage(data.image); // show preview
          }
        }
      } catch (error) {
        console.error("Error fetching vehicle:", error);
        Alert.alert("Error", "Failed to fetch vehicle data.");
      }
    };

    fetchVehicle();
  }, [existingVehicleNumber]);

  const handleUpload = async (): Promise<string | null> => {
    // if no change → return original
    if (image === originalImage) {
      return originalImage;
    }

    if (!selectedImage) {
      console.warn("Error", "No images selected for upload.");
      return null;
    }

    try {
      const folderName = "/vehicles/";
      const imageName = `${vehicleNumber || Date.now()}.jpg`;
      const { filePath } = await uploadViaApi(
        selectedImage,
        folderName,
        imageName
      );
      if (filePath) {
        const { url: signedUrl } = await fetchSignedUrl(filePath);
        return signedUrl; // return URL directly
      }
      return null;
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
      return null;
    }
  };

  const handleSave = async () => {
    if (!vehicleNumber || !type) {
      Alert.alert("Required Fields", "Please enter vehicle number and type.");
      return;
    }

    setLoading(true);

    try {
      const imageFilePath = await handleUpload();

      const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
      const flatDocRef = doc(db, flatRef);

      const vehiclesCollectionRef = collection(
        flatDocRef,
        vehiclesCollectionName
      );

      const vehicleData = {
        type,
        parkingAllotment: source === "Admin" ? parkingAllotment : "",
        note: source === "Admin" ? note : "",
        image: imageFilePath || null,
        createdAt: new Date(),
        ownerName: userName,
      };

      if (isEditMode) {
        const vehicleDocRef = doc(vehiclesCollectionRef, vehicleNumber);
        await updateDoc(vehicleDocRef, vehicleData);
        Alert.alert("Success", "Vehicle updated successfully!", [
          { text: "OK", onPress: () => router.replace("/admin/Vehicles") },
        ]);
      } else {
        // Add new document with vehicleNumber as ID
        const vehicleDocRef = doc(vehiclesCollectionRef, vehicleNumber);
        console.log("vehicleDocRef", vehicleDocRef);
        await setDoc(vehicleDocRef, vehicleData);
        Alert.alert("Success", "Vehicle added successfully!", [
          { text: "OK", onPress: () => router.replace("/admin/Vehicles") },
        ]);
      }
    } catch (error) {
      console.error("Error saving vehicle:", error);
      Alert.alert("Error", "Failed to save vehicle.");
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const uri = await pickImage();
    if (uri) {
      setImage(uri);
      setSelectedImage(uri);
      console.log("Image picked: ", uri);
    }
  };

  const handleCaptureImage = async () => {
    const uri = await captureImage();
    if (uri) {
      setImage(uri);
      setSelectedImage(uri);
      console.log("Image captured: ", uri);
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      {/* AppHeader */}
      <AppHeader
        title={existingVehicleNumber ? "Update Vehicle" : "Add Vehicle"}
        source={source === "Admin" ? "Admin" : "Member"}
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.label}>
          Flat Number : {wing} {flatNumber}
        </Text>

        {/* Dropdown for Balancesheet */}
        <View style={styles.section}>
          <Text style={styles.label}>Type</Text>
          <Dropdown
            data={vehicleTypess.map((option) => ({
              label: option,
              value: option,
            }))}
            onChange={(selectedValue) => {
              setType(selectedValue);
            }}
            placeholder="Select "
            initialValue={type}
          />
        </View>

        {/* Vehicle Number  */}
        <View style={styles.customInput}>
          <CustomInput
            label="Vehicle Number (Ex. GJ27RJ1234)"
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            placeholder="Enter vehicle number"
            editable={!existingVehicleNumber} // Disable editing for existing vehicle
          />
        </View>

        {source === "Admin" && (
          <>
            <Text style={styles.label}>Parking Allotment (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter parking allotment"
              value={parkingAllotment}
              onChangeText={setParkingAllotment}
            />

            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter note"
              value={note}
              onChangeText={setNote}
            />
          </>
        )}

        {/* Choose Image Button */}

        <TouchableOpacity
          style={styles.button}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.buttonText}>Choose Image</Text>
        </TouchableOpacity>

        {/* Reusable ActionModal */}
        <ActionModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          actions={[
            {
              label: "Capture Image from Camera",
              onPress: () => {
                handleCaptureImage();
                setModalVisible(false);
              },
            },
            {
              label: "Pick an Image from Gallery",
              onPress: () => {
                handlePickImage();
                setModalVisible(false);
              },
              color: "#4CAF50",
            },
          ]}
        />

        {image && (
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="contain" // ✅ shows full image without clipping
          />
        )}
      </ScrollView>

      {/* Save Button */}
      <CustomButton
        onPress={handleSave}
        title={"Save"}
        style={{ backgroundColor: "#2196F3", bottom: insets.bottom }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    padding: 16,
  },
  section: { marginBottom: 10 },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  imagePicker: {
    backgroundColor: "#6200ee",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  imagePickerText: {
    color: "#fff",
    fontSize: 16,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: "#6200ee",
    paddingVertical: 10,
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 32,
    alignItems: "center",
    marginBottom: 16,
    marginTop: 48,
    marginHorizontal: 60,
  },
  buttonText: { color: "#fff", fontSize: 16 },
  image: {
    width: 200,
    height: 200,
    marginVertical: 10,
    alignSelf: "center", // ✅ centers horizontally
  },
  customInput: { width: "100%" },
});

export default AddMyVehicle;
