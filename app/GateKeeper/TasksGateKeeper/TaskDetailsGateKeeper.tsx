import { StyleSheet, Text, View, FlatList } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import Feather from "@expo/vector-icons/Feather";
import { ActivityIndicator } from "react-native-paper";

import { useAuthRole } from "@/lib/authRole";
import { db } from "@/firebaseConfig";
import { doc, updateDoc, getDoc, Timestamp } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Dropdown from "@/utils/DropDown";
import CustomInput from "@/components/CustomInput";
import CustomButton from "@/components/CustomButton";

type MessageType = {
  formattedDateTime: string;
  description: string;
  userName: string;
  createdAtDateTime: Timestamp; // Firestore Timestamp
};

const TaskDetailsGateKeeper = () => {
  const insets = useSafeAreaInsets();
  const { item } = useLocalSearchParams();
  // Parse the passed item
  const taskItem = item ? JSON.parse(item as string) : {};

  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<[string, MessageType][]>([]);

  const { userName } = useAuthRole();
  // Initialize status with taskItem.status
  const [status, setStatus] = useState<string>(taskItem.status || "Open");

  const satatusOptions = [
    { label: "Open", value: "Open" },
    { label: "In Progress", value: "In Progress" },
    { label: "Resolved", value: "Resolved" },
    { label: "Rejected", value: "Rejected" },
    { label: "Blocked", value: "Blocked" },
  ];

  // Construct Firestore references
  const taskRef = taskItem.taskDocPath;

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

  const fetchTasks = async () => {
    try {
      const taskDocRef = doc(db, taskRef);
      const docSnapshot = await getDoc(taskDocRef);
      if (docSnapshot.exists()) {
        const messagesData = docSnapshot.data().message || {};
        const messagesArray: [string, MessageType][] =
          Object.entries(messagesData);
        // Sort messages by createdAtDateTime in descending order (latest first)
        messagesArray.sort(
          (a, b) =>
            b[1].createdAtDateTime.toMillis() -
            a[1].createdAtDateTime.toMillis()
        );
        setMessages(messagesArray);
      } else {
        console.log("No document found");
      }
    } catch (error) {
      console.error("Error fetching document:", error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Fetch the existing complain document
      const taskDocRef = doc(db, taskRef);
      const tasksSnap = await getDoc(taskDocRef);

      // Extract existing messages if they exist, otherwise initialize an empty object
      const existingMessages = tasksSnap.exists()
        ? tasksSnap.data().message || {}
        : {};

      const formattedDateTime = formatDateTime(new Date()); // Example: "11 Dec 2024 9:18 pm"
      // Create a unique key for the message entry (timestamp-based)
      const messageKey = `${Date.now()}`;

      // Construct the message as a map of maps
      const newMessage = {
        [messageKey]: {
          formattedDateTime,
          description,
          userName,
          createdAtDateTime: Timestamp.now(), // Store Firestore Timestamp
        },
      };

      // Merge new message with existing messages
      const updatedMessages = { ...existingMessages, ...newMessage };
      // Update the complain document with the new message list
      await updateDoc(taskDocRef, {
        message: updatedMessages,
        status: status, // 👈 update status field too
      });
      // Clear input after sending
      setDescription("");
      await fetchTasks(); // Call fetchComplaint after updateDoc
    } catch (error) {
      console.log("Error Occured while saving Message", error);
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
      <AppbarComponent title={taskItem.taskName} source="GateKeeper" />

      <View style={styles.topContainer}>
        <View style={styles.row}>
          <Text>
            Status: <Text style={styles.messageUser}>{taskItem.status}</Text>
          </Text>
          <Text>
            Priority:{" "}
            <Text style={styles.messageUser}>{taskItem.priority}</Text>
          </Text>
          <Text>
            Type:{" "}
            <Text style={styles.messageUser}>{taskItem.taskCategory}</Text>
          </Text>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        data={messages}
        keyExtractor={([key]) => key}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100, // 👈 add enough gap for footer + FAB
        }}
        renderItem={({ item: [key, message] }) => (
          <View style={styles.messageCard}>
            <Text style={styles.messageUser}>{message.userName}</Text>
            <Text style={styles.messageText}>{message.description}</Text>
            <Text style={styles.messageTime}>{message.formattedDateTime}</Text>
          </View>
        )}
        ListFooterComponent={
          status === "Open" || status === "In Progress" ? (
            <View style={styles.topContainer}>
              {/* Status */}
              <View style={styles.section}>
                <Text style={styles.label}>Status</Text>
                <Dropdown
                  data={satatusOptions}
                  onChange={(selectedValue) => setStatus(selectedValue)}
                  placeholder="Select Status"
                  initialValue={status}
                />

                {/* Message */}
                <View style={{ width: "100%" }}>
                  <CustomInput
                    label="Write a message"
                    value={description}
                    onChangeText={setDescription}
                    multiline={true}
                  />
                </View>
              </View>
            </View>
          ) : null
        }
      />

      {/* ✅ Conditionally show send button */}
      {(status === "Open" || status === "In Progress") && (
        <View style={[styles.inputContainer, { bottom: insets.bottom }]}>
          <CustomButton
            onPress={handleSave}
            style={{ backgroundColor: "#353839" }}
            title={
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Feather
                  name="send"
                  size={18}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={{ color: "#fff", fontWeight: "600" }}>Send</Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
};

export default TaskDetailsGateKeeper;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
  },
  messageCard: {
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    elevation: 4, // For shadow on Android
    shadowColor: "#000", // For shadow on iOS
    shadowOffset: { width: 0, height: 2 }, // For shadow on iOS
    shadowOpacity: 0.1, // For shadow on iOS
    shadowRadius: 4, // For shadow on iOS
    borderWidth: 1, // Optional for outline
    borderColor: "#e0e0e0", // Optional for outline
    margin: 16,
  },
  messageUser: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2196F3",
  },
  messageTime: {
    fontSize: 14,
    color: "gray",
    alignSelf: "flex-end", // Aligns the time to the right side
  },
  messageText: {
    fontSize: 14,
    marginVertical: 4,
  },
  bottomView: {
    position: "absolute", // Ensure it's always at the bottom
    bottom: 0, // Default positioning
    backgroundColor: "gray",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#DDD",
  },
  input: {
    flex: 1,
    padding: 10,
    backgroundColor: "#F5F5F5",
    borderRadius: 2,
    borderWidth: 1,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topContainer: {
    marginHorizontal: 16,
  },
  section: { marginBottom: 16, marginTop: 16 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
});
