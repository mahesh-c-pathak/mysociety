import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import AppbarMenuComponent from "@/components/AppbarMenuComponent";
import Feather from "@expo/vector-icons/Feather";
import { ActivityIndicator } from "react-native-paper";

import { useAuthRole } from "@/lib/authRole";
import { db } from "@/firebaseConfig";
import { doc, updateDoc, getDoc, Timestamp } from "firebase/firestore";

type MessageType = {
  formattedDateTime: string;
  description: string;
  userName: string;
  createdAtDateTime: Timestamp; // Firestore Timestamp
};

const ComplainDetailsAdmin = () => {
  const router = useRouter();
  const { item } = useLocalSearchParams();
  // Parse the passed item
  const complainItem = item ? JSON.parse(item as string) : {};

  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<[string, MessageType][]>([]);
  const [menuVisible, setMenuVisible] = useState(false);

  const { userName } = useAuthRole();

  // Construct Firestore references
  const complainRef = complainItem.complainDocPath;
  //const complainRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}/${customComplainSubcollectionName}/${complainId}`;
  // const complainDocRef = doc(db, complainRef);

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

  const fetchComplaint = async () => {
    try {
      const complainDocRef = doc(db, complainRef);
      const docSnapshot = await getDoc(complainDocRef);
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
    fetchComplaint();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Fetch the existing complain document
      const complainDocRef = doc(db, complainRef);
      const complainSnap = await getDoc(complainDocRef);

      // Extract existing messages if they exist, otherwise initialize an empty object
      const existingMessages = complainSnap.exists()
        ? complainSnap.data().message || {}
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
      await updateDoc(complainDocRef, {
        message: updatedMessages,
      });
      // Clear input after sending
      setDescription("");
      await fetchComplaint(); // Call fetchComplaint after updateDoc
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

  const handleMenuOptionPress = (option: string) => {
    console.log(`${option} selected`);
    if (option === "Edit Complain") {
      setMenuVisible(false);
      router.push({
        pathname: "./addComplainAdmin",
        params: { complainRef },
      });
    }
    setMenuVisible(false);
  };
  const closeMenu = () => {
    setMenuVisible(false);
  };

  return (
    <TouchableWithoutFeedback onPress={closeMenu}>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        {/* Appbar Component */}
        <AppbarComponent
          title={complainItem.complainName}
          source="Admin"
          onPressThreeDot={() => setMenuVisible(!menuVisible)}
        />

        {/* Three-dot Menu */}
        {/* Custom Menu */}
        {menuVisible && (
          <AppbarMenuComponent
            items={["Edit Complain"]}
            onItemPress={handleMenuOptionPress}
            closeMenu={closeMenu}
          />
        )}
        <View style={styles.row}>
          <Text>
            Status:{" "}
            <Text style={styles.messageUser}>{complainItem.status}</Text>
          </Text>
          <Text>
            Priority:{" "}
            <Text style={styles.messageUser}>{complainItem.priority}</Text>
          </Text>
          <Text>
            Type:{" "}
            <Text style={styles.messageUser}>
              {complainItem.complainCategory}
            </Text>
          </Text>
        </View>

        {/* Messages List */}
        <FlatList
          data={messages}
          keyExtractor={([key]) => key}
          renderItem={({ item: [key, message] }) => (
            <View style={styles.messageCard}>
              <Text style={styles.messageUser}>{message.userName}</Text>
              <Text style={styles.messageText}>{message.description}</Text>
              <Text style={styles.messageTime}>
                {message.formattedDateTime}
              </Text>
            </View>
          )}
        />
        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={description}
            onChangeText={setDescription}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSave}>
            <Feather name="send" size={24} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default ComplainDetailsAdmin;

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
});
