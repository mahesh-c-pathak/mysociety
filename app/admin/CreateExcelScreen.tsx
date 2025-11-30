import React from "react";
import { View, Text, Button, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useSociety } from "@/utils/SocietyContext";

const BASE_API_URL = "https://myhousingappvercel.vercel.app/api/generateExcel"; // <-- replace this

const CreateExcelScreen: React.FC = () => {
  const { societyName } = useSociety();
  const downloadAndShareExcel = async () => {
    try {
      if (!societyName) {
        Alert.alert("Error", "Society name is missing");
        return;
      }

      // ✅ Append the society name as a query param
      const apiUrl = `${BASE_API_URL}?society=${encodeURIComponent(societyName)}`;

      const fileUri =
        FileSystem.documentDirectory + "MaintenanceBillSummary.xlsx";

      const { uri } = await FileSystem.downloadAsync(apiUrl, fileUri);

      if (!uri) throw new Error("File not downloaded");

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Sharing not available on this device");
      }
    } catch (error) {
      console.error("Error downloading or sharing Excel:", error);
      Alert.alert("Error", "Failed to download or share Excel file");
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 20, marginBottom: 20 }}>
        Download & Share Maintenance Bill Summary Excel
      </Text>
      <Button title="Get Excel from API" onPress={downloadAndShareExcel} />
    </View>
  );
};

export default CreateExcelScreen;
