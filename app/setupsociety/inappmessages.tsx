import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { Appbar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Message = {
  id: string;
  title: string;
  body: string;
  societyName: string;
  read: boolean;
  path?: string | null; // 🔹 optional navigation path
  createdAt?: { seconds: number; nanoseconds: number };
};

const InAppMessagesScreen = () => {
  const { userId, societies } = useLocalSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!userId || !societies) return;
    const societyList: string[] = JSON.parse(societies as string);

    const unsubscribes = societyList.map((societyName) => {
      const q = query(
        collection(db, "Societies", societyName, "InAppMessages"),
        where("toUserId", "==", userId),
        orderBy("createdAt", "desc")
      );

      return onSnapshot(q, (snapshot) => {
        const newMessages: Message[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
          societyName,
        })) as Message[];

        setMessages((prev) => {
          const merged = [
            ...prev.filter((m) => m.societyName !== societyName),
            ...newMessages,
          ];
          return merged.sort(
            (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
          );
        });
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [userId, societies]);

  /// ✅ Mark message as read and navigate if path exists
  const handlePress = async (message: Message) => {
    try {
      const msgRef = doc(
        db,
        "Societies",
        message.societyName,
        "InAppMessages",
        message.id
      );

      // Mark as read if not already
      if (!message.read) {
        await updateDoc(msgRef, { read: true });
      }

      // Navigate to path if it exists
      if (message.path) {
        router.push(message.path as any);
      }
    } catch (err) {
      console.error("Error handling message press:", err);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const dateStr = item.createdAt
      ? new Date(item.createdAt.seconds * 1000).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        })
      : "";

    return (
      <TouchableOpacity
        onPress={() => handlePress(item)}
        style={styles.cardContainer}
      >
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.date}>{dateStr}</Text>
          </View>
          <Text style={styles.body}>{item.body}</Text>

          <View style={styles.footer}>
            <View style={styles.societyContainer}>
              <Text style={styles.societyName}>{item.societyName}</Text>
            </View>
            {!item.read && <Text style={styles.newBadge}>New</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction color="#fff" onPress={() => router.back()} />
        <Appbar.Content title="Notification" color="#fff" />
      </Appbar.Header>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingTop: insets.top - 20, // 👈 add top padding for Appbar height
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 16,
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No notifications yet.</Text>
        }
      />
    </View>
  );
};

export default InAppMessagesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  header: {
    backgroundColor: "#0288d1",
  },
  cardContainer: {
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  body: {
    fontSize: 14,
    color: "#555",
    marginVertical: 6,
  },
  date: {
    fontSize: 12,
    color: "#888",
  },
  societyContainer: {
    backgroundColor: "#4CAF50",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  societyName: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  newBadge: {
    backgroundColor: "#d32f2f",
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#888",
    fontSize: 16,
  },
});
