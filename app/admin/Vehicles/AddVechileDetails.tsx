import React, { useState } from "react";
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
import { doc, collection, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";
import CustomInput from "@/components/CustomInput";
import CustomButton from "@/components/CustomButton";
import Dropdown from "@/utils/DropDown";
import ActionModal from "@/components/ActionModal";
import AppHeader from "@/components/AppHeader";
import LoadingIndicator from "@/components/LoadingIndicator";
import {
  pickImage,
  captureImage,
  uploadViaApi,
  fetchSignedUrl,
} from "@/utils/imagekitUtils";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AddVechileDetails = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wing, floorName, flatNumber, flatType } = useLocalSearchParams();
  const { societyName } = useSociety();

  const vehiclesCollectionName = `vehicles_${societyName}`;
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [type, setType] = useState("");
  const [parkingAllotment, setParkingAllotment] = useState("");
  const [note, setNote] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const vehicleTypess = [
    "Tempo",
    "Truck",
    "Scooter",
    "Rickshaw",
    "Bike",
    "Car",
    "Other",
  ];

  const handlePickImage = async () => {
    const uri = await pickImage();
    if (uri) {
      setImage(uri);
      setSelectedImage(uri);
    }
  };

  const handleCaptureImage = async () => {
    const uri = await captureImage();
    if (uri) {
      setImage(uri);
      setSelectedImage(uri);
    }
  };

  const handleUpload = async (): Promise<string | null> => {
    if (!selectedImage) return null;

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
        return signedUrl;
      }
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
    }
    return null;
  };

  const handleSave = async () => {
    if (!vehicleNumber || !type) {
      Alert.alert("Required Fields", "Please enter vehicle number and type.");
      return;
    }

    setLoading(true);

    try {
      const imageUrl = await handleUpload();

      const flatRef = `Societies/${societyName}/${
        societyName + " wings"
      }/${wing}/${societyName + " floors"}/${floorName}/${
        societyName + " flats"
      }/${flatNumber}`;

      const flatDocRef = doc(db, flatRef);
      const vehiclesCollectionRef = collection(
        flatDocRef,
        vehiclesCollectionName
      );

      // ✅ fetch flat owner info separately
      let ownerName = "No Name";
      const flatSnap = await getDoc(flatDocRef);
      if (flatSnap.exists()) {
        const flatData = flatSnap.data();
        const userDetailsMap = flatData?.userDetails || {};
        const firstUser = Object.values(userDetailsMap)[0] as any; // get the first user object
        ownerName = firstUser?.userName || "No Name";
      }

      const vehicleData = {
        type,
        parkingAllotment,
        note,
        image: imageUrl,
        createdAt: new Date(),
        ownerName,
      };

      const vehicleDocRef = doc(vehiclesCollectionRef, vehicleNumber);
      await setDoc(vehicleDocRef, vehicleData);

      Alert.alert("Success", "Vehicle added successfully!", [
        { text: "OK", onPress: () => router.replace("/admin/Vehicles") },
      ]);
    } catch (error) {
      console.error("Error saving vehicle:", error);
      Alert.alert("Error", "Failed to save vehicle.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingIndicator />;

  return (
    <View style={styles.container}>
      <AppHeader
        title="Add Vehicle"
        source="Admin"
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.label}>
          Flat: {wing} {flatNumber} ({flatType})
        </Text>

        <Text style={styles.label}>Type</Text>
        <Dropdown
          data={vehicleTypess.map((v) => ({ label: v, value: v }))}
          onChange={setType}
          placeholder="Select Type"
          initialValue={type}
        />

        <CustomInput
          label="Vehicle Number"
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          placeholder="Enter vehicle number"
        />

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

        <TouchableOpacity
          style={styles.button}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.buttonText}>Choose Image</Text>
        </TouchableOpacity>

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
            },
          ]}
        />

        {image && (
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="contain"
          />
        )}
      </ScrollView>

      <CustomButton
        onPress={handleSave}
        title="Save"
        style={{ backgroundColor: "#2196F3", bottom: insets.bottom }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  contentContainer: { padding: 16 },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 32,
    alignItems: "center",
    marginVertical: 16,
  },
  buttonText: { color: "#fff", fontSize: 16 },
  image: {
    width: 200,
    height: 200,
    marginVertical: 10,
    alignSelf: "center", // ✅ centers horizontally
  },
});

export default AddVechileDetails;
