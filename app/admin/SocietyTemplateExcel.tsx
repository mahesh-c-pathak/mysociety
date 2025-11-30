import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Text, Button, ActivityIndicator } from "react-native-paper";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { app, auth, storage } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";
import * as DocumentPicker from "expo-document-picker";

const SocietyTemplateExcel = () => {
  const { societyName } = useSociety();
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");
  const functions = getFunctions(app, "us-central1");
  const db = getFirestore(app);
  const [uploading, setUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [excelPath, setExcelPath] = useState(
    "Indrajeet/Filled/Indrajeet_1763106478158.xlsx"
  );

  // 🧾 Generate Excel only (no sharing)
  const handleGenerate = async () => {
    if (!auth.currentUser) {
      Alert.alert("Not Signed In", "Please sign in to continue.");
      return;
    }

    if (!societyName) {
      Alert.alert("Error", "Society name not found.");
      return;
    }

    setLoading(true);
    setMessage("Generating Excel template...");

    try {
      console.log("🧾 Generating Excel for:", societyName);

      const welcomeUser = httpsCallable(functions, "welcomeUser");
      const result = await welcomeUser({ societyName });
      const data: any = result.data;

      if (data.success) {
        console.log("✅ Excel generated successfully for:", societyName);
        setMessage(data.message || "Excel generated successfully!");
      } else {
        console.error("❌ Failed to generate Excel:", data);
        setMessage("Failed to generate Excel.");
      }
    } catch (error: any) {
      console.error("❌ Excel generation failed:", error);
      Alert.alert("Error", error.message || "Failed to generate Excel.");
    } finally {
      setLoading(false);
    }
  };

  // ⬇️ Download the latest generated file from Firestore reference
  const handleDownloadLatest = async () => {
    if (!societyName) {
      Alert.alert("Error", "Society name not found.");
      return;
    }

    setDownloading(true);
    setMessage("Fetching latest file...");

    try {
      const societyRef = doc(db, "Societies", societyName);
      const societySnap = await getDoc(societyRef);

      if (!societySnap.exists()) {
        throw new Error("Society not found in Firestore.");
      }

      const latestTemplateUrl = societySnap.data()?.latestTemplateUrl;
      if (!latestTemplateUrl) {
        throw new Error("No template available.");
      }

      const fileRef = ref(storage, latestTemplateUrl);
      const url = await getDownloadURL(fileRef);
      const ExlfileName = `${societyName.replace(/\s+/g, "_")}_Template.xlsx`;

      setMessage("Downloading file...");
      const localUri = FileSystem.documentDirectory + ExlfileName;

      const { uri } = await FileSystem.downloadAsync(url, localUri);
      setMessage("Download complete!");

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        setMessage(`File downloaded to: ${uri}`);
      }
    } catch (error: any) {
      console.error("Download error:", error);
      Alert.alert("Error", error.message || "Failed to download file.");
    } finally {
      setDownloading(false);
    }
  };

  // pick excel to Upload

  const handlePickExcel = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;

      const file = res.assets[0];

      setSelectedFileUri(file.uri);
      setSelectedFileName(file.name);

      Alert.alert("Selected File", file.name);
    } catch (err) {
      Alert.alert("Error", "Failed to pick file: " + err);
    }
  };

  // Upload Excel

  // ⬆️ Upload the Excel to Firebase Storage
  const uploadExcel = async () => {
    if (!selectedFileUri || !selectedFileName) {
      return Alert.alert("No File", "Please select an Excel file first.");
    }

    if (!societyName) {
      return Alert.alert("Error", "Society name not found.");
    }

    setUploading(true);

    try {
      // Convert file to blob (Expo-safe)
      const response = await fetch(selectedFileUri);
      const blob = await response.blob();

      // Generate timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      // Add timestamp to filename
      const fileNameWithTimestamp = `${selectedFileName.replace(
        /\.xlsx?$/,
        ""
      )}_${timestamp}.xlsx`;

      const path = `${societyName}/Filled/${fileNameWithTimestamp}`;
      setExcelPath(path);
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, blob);

      const downloadURL = await getDownloadURL(storageRef);

      Alert.alert("✅ Upload Successful", `File uploaded:\n${downloadURL}`);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Upload Failed", error.message || "Error uploading file.");
    } finally {
      setUploading(false);
    }
  };

  // Create Users

  const callRegisterSocietyUsers = async () => {
    if (!excelPath) {
      return Alert.alert("Error", "Please enter the Excel file path.");
    }

    if (!societyName) {
      return Alert.alert("Error", "Society name missing.");
    }

    setUploading(true);

    try {
      const registerFn = httpsCallable(functions, "registerSocietyUsers");

      const res: any = await registerFn({
        societyName,
        filePath: excelPath, // 🔥 using the user-entered path
      });

      if (res.data.success) {
        Alert.alert("Success", res.data.message);
      } else {
        Alert.alert("Error", "Something went wrong.");
      }
    } catch (error: any) {
      console.log("❌ Register error:", error);
      Alert.alert("Error", error.message || "Failed to process the Excel.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.title}>
        🧾 Generate Society Excel
      </Text>
      <Text style={styles.subTitle}>Society: {societyName}</Text>

      <Button
        mode="contained"
        onPress={handleGenerate}
        disabled={loading}
        style={styles.button}
      >
        {loading ? "Generating..." : "Generate Excel"}
      </Button>

      {loading && (
        <ActivityIndicator animating size="large" style={{ marginTop: 20 }} />
      )}

      {downloading ? (
        <ActivityIndicator animating={true} size="large" />
      ) : (
        <Button mode="contained" onPress={handleDownloadLatest}>
          Download Latest Template
        </Button>
      )}

      <Text style={styles.message}>{message}</Text>
      <Button mode="contained" style={styles.button} onPress={handlePickExcel}>
        Select Filled Excel
      </Button>

      {selectedFileName && (
        <Text style={{ textAlign: "center", marginVertical: 10 }}>
          Selected: {selectedFileName}
        </Text>
      )}

      <Button
        mode="contained"
        disabled={!selectedFileUri || uploading}
        style={styles.button}
        onPress={uploadExcel}
      >
        {uploading ? "Uploading & Validating..." : "Upload & Validate Excel"}
      </Button>

      <Button
        mode="contained"
        style={styles.button}
        disabled={uploading}
        onPress={callRegisterSocietyUsers}
      >
        {uploading ? "Processing..." : "Register Users from Excel"}
      </Button>
    </View>
  );
};

export default SocietyTemplateExcel;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "bold",
  },
  subTitle: {
    textAlign: "center",
    marginBottom: 30,
    color: "gray",
  },
  button: {
    borderRadius: 8,
    marginBottom: 16,
  },
  message: {
    marginTop: 20,
    textAlign: "center",
  },
});
