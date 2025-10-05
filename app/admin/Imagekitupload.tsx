import React, { useState } from "react";
import {
  View,
  Button,
  Image,
  Alert,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import {
  pickImage,
  captureImage,
  fetchSignedUrl,
  uploadViaApi,
} from "@/utils/imagekitUtils";

import ActionModal from "@/components/ActionModal";

export default function Imagekitupload() {
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [privateFilePath, setPrivateFilePath] = useState<string | null>(null);
  const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [folderName, setFolderName] = useState("/expo-test-uploads-private/");
  const [modalVisible, setModalVisible] = useState(false);

  const handlePickImage = async () => {
    const uri = await pickImage();
    if (uri) {
      setImage(uri);
      console.log("Image picked: ", uri);
    }
  };

  const handleCaptureImage = async () => {
    const uri = await captureImage();
    if (uri) {
      setImage(uri);
      console.log("Image captured: ", uri);
    }
  };

  const handleFetchSignedUrl = async () => {
    if (!privateFilePath) {
      Alert.alert("Error", "No uploaded file path available.");
      return;
    }
    setLoading(true);
    setMessage("Fetching signed URL...");
    try {
      const { url } = await fetchSignedUrl(privateFilePath);
      setSignedImageUrl(url);
      setMessage("Signed URL loaded successfully!");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadViaApi = async () => {
    if (!image) {
      Alert.alert("No Image", "Please select an image first.");
      return;
    }
    setUploading(true);
    setMessage("Uploading via API...");
    try {
      const { filePath } = await uploadViaApi(image, folderName);
      setPrivateFilePath(filePath);
      setMessage("Upload successful via API!");
      console.log("Uploaded file path:", filePath);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {/* Single Choose Image button */}
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

      <TextInput
        style={styles.input}
        value={folderName}
        onChangeText={setFolderName}
        placeholder="/your-folder/"
      />

      {image && <Image source={{ uri: image }} style={styles.image} />}

      <View style={styles.buttonContainer}>
        <Button
          title={uploading ? "Uploading..." : "Upload via API"}
          onPress={handleUploadViaApi}
          disabled={uploading || !image}
        />
      </View>

      {privateFilePath && (
        <Button
          title={loading ? "Loading..." : "Retrieve Private Image"}
          onPress={handleFetchSignedUrl}
          disabled={loading}
        />
      )}

      {signedImageUrl && (
        <Image source={{ uri: signedImageUrl }} style={styles.image} />
      )}

      {(uploading || loading) && (
        <ActivityIndicator size="large" color="#0000ff" />
      )}
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  image: {
    width: 200,
    height: 200,
    marginVertical: 10,
  },
  buttonContainer: {
    marginVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    borderRadius: 10,
    width: "80%",
    marginBottom: 10,
  },
});
