import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import Feather from "@expo/vector-icons/Feather";
import LoadingIndicator from "@/components/LoadingIndicator"; // new import
import AppHeader from "@/components/AppHeader"; // Updated import
import { useSociety } from "@/utils/SocietyContext";
import { db } from "@/firebaseConfig";
import { useAuthRole } from "@/lib/authRole";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  doc,
  updateDoc,
  getDoc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

type MessageType = {
  formattedDateTime: string;
  description: string;
  userName: string;
  createdAtDateTime: Timestamp; // Firestore Timestamp
};

const ComplainDetails = () => {
  const router = useRouter();
  const { item } = useLocalSearchParams();
  // Parse the passed item
  const complainItem = item ? JSON.parse(item as string) : {};

  const complainId = complainItem.id;

  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<[string, MessageType][]>([]);

  const { userName } = useAuthRole();
  const insets = useSafeAreaInsets();
  const { source } = useLocalSearchParams();
  const localParams = useLocalSearchParams();
  const societyContext = useSociety();

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

  const customComplainSubcollectionName = `${societyName} complains`;

  // Construct Firestore references
  const complainRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}/${customComplainSubcollectionName}/${complainId}`;
  const complainDocRef = doc(db, complainRef);

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

  useEffect(() => {
    const unsubscribe = onSnapshot(complainDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const messagesData = docSnapshot.data().message || {};
        const messagesArray: [string, MessageType][] =
          Object.entries(messagesData);
        setMessages(messagesArray);
      }
    });

    return () => unsubscribe();
  }, [complainDocRef]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Fetch the existing complain document
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
    } catch (error) {
      console.log("Error Occured while saving Message", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingView}
    >
      <View style={styles.container}>
        {/* AppHeader */}
        <AppHeader
          title={complainItem.complainName}
          source={source === "Admin" ? "Admin" : "Member"}
          onBackPress={() => router.back()}
        />

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
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
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
        <View style={[styles.inputContainer, { bottom: insets.bottom }]}>
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
    </KeyboardAvoidingView>
  );
};

export default ComplainDetails;

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

  keyboardAvoidingView: {
    flex: 1,
  },
});
