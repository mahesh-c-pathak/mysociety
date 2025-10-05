import {
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import React, { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system";

import {
  uploadToBackblaze,
  downloadFromBackblaze,
  deleteFromBackblaze,
} from "@/utils/backblazeUtils";

const Fileupload = () => {
  const insets = useSafeAreaInsets();

  const [files, setFiles] = useState<
    { name: string; uri: string; mimeType: string }[]
  >([]); // Updated type

  // Updated upload/download functions with folder support
  const folderName = "testusha"; // Change this dynamically if needed

  // Pick files, including PDFs and XLS
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/vnd.ms-excel", "image/*"], // Allowed file types
        copyToCacheDirectory: true,
      });

      console.log("Document Picker Result:", result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const { uri, name, mimeType } = result.assets[0]; // Access the first file

        setFiles((prev) => [
          ...prev,
          { name, uri, mimeType: mimeType || "application/octet-stream" },
        ]); // Add  name, mimeType and URI to files array
        // setFiles((prev) => [...prev, uri]); // Add file URI to the list
        // setFiles([uri]); // Overwrite files with the new selection
      } else {
        console.log("File picking was canceled or no file selected.");
      }
    } catch (error) {
      console.error("Error picking file:", error);
    }
  };

  // Send selected files by email
  const sendEmail = async () => {
    try {
      if (files.length === 0) {
        Alert.alert("⚠️ No Files", "Please pick files before sending.");
        return;
      }

      // Convert files to base64 attachments
      const attachments = [];
      for (const file of files) {
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: "base64",
        });
        attachments.push({
          filename: file.name,
          content: base64,
          encoding: "base64",
        });
      }

      // Call Vercel sendMail API
      const res = await fetch(
        "https://myhousingappvercel.vercel.app/api/sendMail",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "mahesh.c.pathak@gmail.com", // <-- change to recipient
            subject: "Files from Expo App",
            text: "Please find the attached files.",
            attachments,
          }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        Alert.alert("✅ Success", data.message || "Email sent!");
      } else {
        throw new Error(data.error || "Failed to send email");
      }
    } catch (err: any) {
      console.error("Email send error:", err);
      Alert.alert("❌ Error", err.message);
    }
  };

  const uploadAllFiles = async () => {
    try {
      for (const file of files) {
        await uploadToBackblaze(folderName, file.name, file.uri, file.mimeType);
      }
      Alert.alert("✅ Success", "All files uploaded to Backblaze");
    } catch (err: any) {
      Alert.alert("❌ Upload failed", err.message);
    }
  };

  const downloadFile = async (fileName: string) => {
    try {
      await downloadFromBackblaze(folderName, fileName);
    } catch (err: any) {
      Alert.alert("❌ Download failed", err.message);
    }
  };

  const deleteFile = async (fileName: string, uri: string) => {
    try {
      await deleteFromBackblaze(folderName, fileName);
      setFiles((prev) => prev.filter((file) => file.uri !== uri));
      Alert.alert("✅ Deleted", `File ${fileName} deleted`);
    } catch (err: any) {
      Alert.alert("❌ Delete failed", err.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { top: insets.top }]}>
        <Text>Fileupload</Text>
        <TouchableOpacity style={styles.button} onPress={pickFile}>
          <Text style={styles.buttonText}>Pick a File (PDF, XLS, Image)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#FF5722" }]}
          onPress={sendEmail}
        >
          <Text style={styles.buttonText}>Send Email</Text>
        </TouchableOpacity>
        {/* Upload All Button */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#388E3C" }]}
          onPress={uploadAllFiles}
        >
          <Text style={styles.buttonText}>Upload All Files</Text>
        </TouchableOpacity>
        <FlatList
          data={files}
          renderItem={({ item }) => (
            <View style={styles.fileContainer}>
              {/* Ensure item.name is properly rendered */}
              <Text style={styles.fileText}>{`${item.name} is attached`}</Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  setFiles((prev) =>
                    prev.filter((file) => file.uri !== item.uri)
                  ); // Delete file logic
                }}
              >
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
              {/* Download Button */}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#00796B" }]}
                onPress={() => downloadFile(item.name)}
              >
                <Text style={styles.buttonText}>Download</Text>
              </TouchableOpacity>
              {/* Delete Button */}
              <TouchableOpacity
                style={styles.button}
                onPress={async () => {
                  // 1. Delete from Backblaze
                  await deleteFile(folderName, item.name);

                  // 2. Remove from local state
                  setFiles((prev) =>
                    prev.filter((file) => file.uri !== item.uri)
                  );
                }}
              >
                <Text style={styles.buttonText}>Delete from api</Text>
              </TouchableOpacity>
            </View>
          )}
          keyExtractor={(item) => item.uri}
        />
      </View>
    </SafeAreaView>
  );
};

export default Fileupload;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  image: {
    width: 200,
    height: 200,
    marginVertical: 10,
  },
  fileText: {
    fontSize: 16,
    marginVertical: 5,
  },
  imageContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  fileContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  button: {
    padding: 10,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5C6BC0",
    shadowColor: "#5C6BC0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
    marginVertical: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  message: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
});
