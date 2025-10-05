import { StyleSheet, Text, View, ScrollView, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import AppbarComponent from "@/components/AppbarComponent"; // Adjust the path as per your structure
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import Dropdown from "@/utils/DropDown";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { useSociety } from "@/utils/SocietyContext";

import { Switch, ActivityIndicator } from "react-native-paper";
import { db } from "@/firebaseConfig";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  Timestamp,
  updateDoc,
  DocumentData,
} from "firebase/firestore";
import { useAuthRole } from "@/lib/authRole";

const AddComplainAdmin = () => {
  const { userName } = useAuthRole();
  const { societyName } = useSociety();
  const { complainRef: complainRefParam } = useLocalSearchParams();

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [previousData, setPreviousData] = useState<DocumentData | null>(null);

  const complainRef = complainRefParam as string;
  const isEditMode = !!complainRef;

  const customComplainSubcollectionName = `${societyName} complains`;

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

  const satatusOptions = [
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

  const fetchExistingComplain = async () => {
    setLoading(true);
    try {
      // Fetch the existing complain document
      const complainDocRef = doc(db, complainRef);
      const complainSnap = await getDoc(complainDocRef);
      if (complainSnap.exists()) {
        const complainData = complainSnap.data();
        setComplainName(complainData.complainName);
        setComplainCategory(complainData.complainCategory);
        setDescription(complainData.description);
        setPriority(complainData.priority);
        setStatus(complainData.status);
        setClassification(complainData.classification);
        setPreviousData(complainData); // Store previous data in state
      }
    } catch (error) {
      console.error("Error fetching document:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (complainRef) {
      fetchExistingComplain();
    }
  }, [complainRef]); // Runs only if complainRef is not empty

  const handleUpdate = async () => {
    setLoading(true);
    try {
      // Fetch the existing document
      const complainDocRef = doc(db, complainRef);
      const complainSnap = await getDoc(complainDocRef);
      if (!complainSnap.exists()) {
        Alert.alert("Error", "Complaint not found.");
        setLoading(false);
        return;
      }

      const previousData = complainSnap.data();
      const existingMessages = previousData?.message || {};
      const currentDate = new Date();
      const formattedDateTime = formatDateTime(currentDate);
      const messageKey = `${Date.now()}`;

      // Prepare change logs
      const changeLogs = [];
      if (previousData.priority !== priority)
        changeLogs.push(`Priority changed to ${priority}`);
      if (previousData.status !== status)
        changeLogs.push(`Status changed to ${status}`);
      if (previousData.complainCategory !== complainCategory)
        changeLogs.push(`Category changed to ${complainCategory}`);
      if (previousData.classification !== classification)
        changeLogs.push(`Classification changed to ${classification}`);
      if (previousData.complainName !== complainName)
        changeLogs.push(`Complain Name changed to ${complainName}`);
      if (previousData.description !== description)
        changeLogs.push(`Description changed to ${description}`);

      // Create a new message entry with change logs
      const newMessage = {
        formattedDateTime,
        description:
          changeLogs.length > 0 ? `${changeLogs.join("\n- ")}` : description,
        userName,
        createdAtDateTime: Timestamp.now(),
      };

      // Update the existing document
      await updateDoc(complainDocRef, {
        complainName,
        complainCategory,
        classification,
        priority,
        status,
        message: {
          ...existingMessages,
          [messageKey]: newMessage,
        },
      });

      Alert.alert("Success", "Complaint Updated Successfully.", [
        {
          text: "OK",
          onPress: () => router.replace("/admin/Complainsadmin?source=Admin"),
        },
      ]);
    } catch (error) {
      console.log("Error Occurred while updating Complain Data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Construct Firestore references
      const societyRef = `Societies/${societyName}`;
      const flatDocRef = doc(db, societyRef);
      const complainCollectionRef = collection(
        flatDocRef,
        customComplainSubcollectionName
      );

      // Get current date and time
      const currentDate = new Date();
      const formattedDateTime = formatDateTime(currentDate);
      const messageKey = `${Date.now()}`;

      // Create a new message entry
      const newMessage = {
        formattedDateTime,
        description,
        userName,
        createdAtDateTime: Timestamp.now(),
      };

      // Create a new complaint document
      await addDoc(complainCollectionRef, {
        complainName,
        description,
        complainCategory,
        classification,
        priority,
        status,
        createdBy: userName,
        message: { [messageKey]: newMessage },
        createdAt: Timestamp.now(),
      });

      Alert.alert("Success", "Complaint Added Successfully.", [
        {
          text: "OK",
          onPress: () => router.replace("/admin/Complainsadmin?source=Admin"),
        },
      ]);
    } catch (error) {
      console.log("Error Occurred while saving Complain Data", error);
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
      {/* Appbar Component */}
      <AppbarComponent title="Add Complain" source="Admin" />

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
            data={satatusOptions}
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
        onPress={isEditMode ? handleUpdate : handleSave}
        title={isEditMode ? "Update" : "Save"}
      />
    </View>
  );
};

export default AddComplainAdmin;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContainer: { padding: 16 },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  customInput: { width: "100%" },
  section: { marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center", // Ensures vertical alignment
  },
});
