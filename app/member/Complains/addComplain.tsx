import { StyleSheet, Text, View, ScrollView, Alert } from "react-native";
import React, { useState } from "react";
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import Dropdown from "@/utils/DropDown";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSociety } from "@/utils/SocietyContext";

import { Switch } from "react-native-paper";
import { db } from "@/firebaseConfig";
import { collection, doc, addDoc, Timestamp } from "firebase/firestore";

import { useAuthRole } from "@/lib/authRole";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppHeader from "@/components/AppHeader"; // Updated import
import LoadingIndicator from "@/components/LoadingIndicator"; // new import

import { sendInAppMessage } from "@/utils/sendInAppMessage";
import { fetchAdminIds } from "@/utils/fetchAdminIds";

const AddComplain = () => {
  const { userName, user } = useAuthRole();
  const userId = user!.uid;

  const insets = useSafeAreaInsets();
  const { source } = useLocalSearchParams();
  const localParams = useLocalSearchParams();
  const societyContext = useSociety();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Determine params based on source
  const societyName =
    source === "Admin" ? localParams.societyName : societyContext.societyName;
  const wing = source === "Admin" ? localParams.wing : societyContext.wing;
  const flatNumber =
    source === "Admin" ? localParams.flatNumber : societyContext.flatNumber;
  const floorName =
    source === "Admin" ? localParams.floorName : societyContext.floorName;

  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;

  // const customComplainSubcollectionName = `${societyName} complains`;

  const customComplainSubcollectionName = "complains";

  const [complainName, setComplainName] = useState<string>("");
  const [complainCategory, setComplainCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [classification, setClassification] = useState<"Private" | "Public">(
    "Private"
  );
  const [priority, setPriority] = useState<string>("Low");
  const [status, setStatus] = useState<string>("Open");

  const category = [
    { label: "Lift", value: "Lift" },
    { label: "Water leakage", value: "Water leakage" },
  ];

  const priorityOptions = [
    { label: "Low", value: "Low" },
    { label: "Medium", value: "Medium" },
    { label: "High", value: "High" },
  ];

  const atatusOptions = [
    { label: "Open", value: "Open" },
    { label: "In Progress", value: "In Progress" },
    { label: "Resolved", value: "Resolved" },
    { label: "Rejected", value: "Rejected" },
    { label: "Blocked", value: "Blocked" },
  ];

  const formatDateTime = (date: Date) => {
    return date
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", "");
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Construct Firestore references
      const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
      const flatDocRef = doc(db, flatRef);

      const complainCollectionRef = collection(
        flatDocRef,
        customComplainSubcollectionName
      );

      // Get current date and time
      const currentDate = new Date();
      const createdAt = currentDate;
      const createdDate = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD format
      const createdTime = currentDate.toTimeString().split(" ")[0]; // HH:MM:SS format
      const formattedDateTime = formatDateTime(currentDate); // Example: "11 Dec 2024 9:18 pm"

      // Create a unique key for the message entry (timestamp-based)
      const messageKey = `${Date.now()}`;

      // Construct the message as a map of maps
      const message = {
        [messageKey]: {
          formattedDateTime,
          description,
          userName,
          createdAtDateTime: Timestamp.now(), // Store Firestore Timestamp
        },
      };

      // Save complaint data
      await addDoc(complainCollectionRef, {
        societyName,
        complainName,
        description,
        complainCategory,
        classification,
        priority,
        status,
        createdAt,
        createdDate,
        createdTime,
        createdBy: `${wing} ${flatNumber}`,
        message,
      });
      console.log("Complaint saved successfully");

      // /(Complains)/(ComplainTypes)?source=Member

      // 🔹 Send in-app message to all admins + complain creator
      const adminIds = await fetchAdminIds(societyName as string);
      // Include the complain creator’s UID (userId from auth)
      const allRecipients = Array.from(
        new Set([...adminIds, userId].filter(Boolean))
      ); // removes duplicates & falsy values

      const title = `Complain Created for ${complainName}`;
      const body = description;

      await Promise.all(
        allRecipients.map((recipientId) =>
          sendInAppMessage(
            societyName as string,
            recipientId,
            title,
            body,
            "complain_created"
          )
        )
      );

      Alert.alert("Success", `Complain Added successfully.`, [
        {
          text: "OK",
          onPress: () =>
            router.replace(
              "/member/Complains/ComplainTypes/OpenComplains?source=Member"
            ),
        },
      ]);
    } catch (error) {
      console.log("Error Occured while saving Complain Data", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      {/* AppHeader */}
      <AppHeader
        title="Add Complain"
        source={source === "Admin" ? "Admin" : "Member"}
        onBackPress={() => router.back()}
      />

      <ScrollView style={styles.scrollContainer}>
        {/* switch - for classification Public/Private */}
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Public </Text>
          <Switch
            value={classification === "Public"}
            onValueChange={() =>
              setClassification((prev) =>
                prev === "Private" ? "Public" : "Private"
              )
            }
            color="#4CAF50"
          />
        </View>

        {/* Complain Name */}
        <View style={styles.customInput}>
          <CustomInput
            label="Complain Name"
            value={complainName}
            onChangeText={setComplainName}
          />
        </View>

        {/* Complain Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <Dropdown
            data={category}
            onChange={(selectedValue) => {
              setComplainCategory(selectedValue);
            }}
            placeholder="Select Category"
            initialValue={complainCategory}
          />
        </View>

        {/* Description */}
        <View style={styles.customInput}>
          <CustomInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline={true}
          />
        </View>

        {/* Priority Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Priority</Text>
          <Dropdown
            data={priorityOptions}
            onChange={(selectedValue) => {
              setPriority(selectedValue);
            }}
            placeholder="Select Priority"
            initialValue={priority}
          />
        </View>

        {/* Status Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Status</Text>
          <Dropdown
            data={atatusOptions}
            onChange={(selectedValue) => {
              setStatus(selectedValue);
            }}
            placeholder="Select Status"
            initialValue={status}
          />
        </View>
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

export default AddComplain;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContainer: { padding: 16 },
  customInput: { width: "100%" },
  section: { marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center", // Ensures vertical alignment
  },
});
