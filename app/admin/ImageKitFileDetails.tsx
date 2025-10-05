// ImageKitFileDetails.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Button,
  Alert,
} from "react-native";
import { Card, Title, Paragraph } from "react-native-paper";
import { getFileDetailsFromUrl, deleteFileViaApi } from "@/utils/imagekitUtils";

const ImageKitFileDetails = () => {
  const [url, setUrl] = useState<string>(
    "https://ik.imagekit.io/8ydabhbti/vehicles/MH11DN1111_ZUnhJ1PD9c.jpg?ik-s=928d788ebaf811cfbcb9408124654297a82c43e9"
  );
  const [fileData, setFileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFileDetails = async (fileUrl: string) => {
    setLoading(true);
    setError(null);
    setFileData(null);

    try {
      const data = await getFileDetailsFromUrl(fileUrl);
      setFileData(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch file details");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!fileData?.fileId) return;

    Alert.alert("Delete File", "Are you sure you want to delete this file?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await deleteFileViaApi(fileData.fileId);
            Alert.alert("Success", "File deleted successfully");
            setFileData(null);
          } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to delete file");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  useEffect(() => {
    fetchFileDetails(url);
  }, [url]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        placeholder="Enter ImageKit URL"
      />
      <Button
        title="Fetch File Details"
        onPress={() => fetchFileDetails(url)}
      />

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      )}

      {error && (
        <View style={styles.center}>
          <Text style={{ color: "red" }}>{error}</Text>
        </View>
      )}

      {fileData && (
        <Card style={{ marginTop: 16 }}>
          <Card.Cover source={{ uri: fileData.url }} />
          <Card.Content>
            <Title>{fileData.name}</Title>
            <Paragraph>File ID: {fileData.fileId}</Paragraph>
            <Paragraph>Size: {fileData.size} bytes</Paragraph>
            <Paragraph>
              Dimensions: {fileData.width}x{fileData.height}
            </Paragraph>
            <Paragraph>MIME Type: {fileData.mime}</Paragraph>
            <Paragraph>
              Created At: {new Date(fileData.createdAt).toLocaleString()}
            </Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button
              title="Delete File Via Api"
              color="red"
              onPress={handleDeleteFile}
            />
          </Card.Actions>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    marginTop: 100,
  },
});

export default ImageKitFileDetails;
