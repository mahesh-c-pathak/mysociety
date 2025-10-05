import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Linking
} from "react-native";
import React, { useState, useEffect } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import { useRouter, Stack } from "expo-router";
import { FAB } from "react-native-paper";
import {  doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";
import { FontAwesome } from "@expo/vector-icons"; // Import Expo icons
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GatekeepersA = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { societyName } = useSociety();
  const [gateKeepers, setGateKeepers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const makeCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch((err) =>
      console.error("Error opening dialer:", err)
    );
  };

  useEffect(() => {
    const fetchGateKeepers = async () => {
      try {
        const societyRef = doc(db, "Societies", societyName);
        const societyDoc = await getDoc(societyRef);

        if (societyDoc.exists()) {
          const data = societyDoc.data();
          const gateKeepersArray = data.gateKeepers || [];

          // Convert object-based gateKeepers array into a list format
          const formattedGateKeepers = gateKeepersArray.map((entry: any) => {
            const userId = Object.keys(entry)[0]; // Extract userId
            const details = entry[userId]; // Get details

            return { id: userId, ...details }; // Spread details into the object
          });
          setGateKeepers(formattedGateKeepers);
        }
      } catch (error) {
        console.error("Error fetching gatekeepers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGateKeepers();
  }, [societyName]);

  const renderGateKeeper = ({ item }: { item: any }) => {
    const hasImage =
      item.selectedImageUrl && item.selectedImageUrl.trim() !== "";
    const initials = item.firstName
      ? item.firstName.charAt(0).toUpperCase()
      : "?";

    return (
      <View style={styles.cardview}>
        <View style={styles.cardCointainer}>
          <View style={styles.rowedy}>
            <View style={styles.profileContainer}>
              {hasImage ? (
                <Image
                  source={{ uri: item.selectedImageUrl }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.initialsContainer}>
                  <Text style={styles.initialsText}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "bold" }}>{item.displayName}</Text>
              <Text style={{ marginBottom: 8 }}>{item.mobileNumber}</Text>
            </View>
          </View>
          {/* Call Button */}
          <TouchableOpacity
            style={styles.buttonWrapper}
            onPress={() => {
              makeCall(item.mobileNumber);
            }}
          >
            <FontAwesome name="phone" size={24} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </View>
    );
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
      <AppbarComponent title="Gate Keeper" source="Admin" />
      <FlatList
        data={gateKeepers}
        renderItem={renderGateKeeper}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyMessage}>No Daily Helpers added</Text>
        }
      />

      <View
        style={[
          styles.footer,
          { bottom: insets.bottom },
        ]}
      >
      <FAB
        style={styles.fab}
        icon="plus"
        color="white"
        onPress={() => router.push("/admin/GateKeeperAdmin/AddGateKeeperA")}
      />
      </View>
    </View>
  );
};
 
export default GatekeepersA;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardview: {
    marginBottom: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    elevation: 4, // For shadow on Android
    shadowColor: "#000", // For shadow on iOS
    shadowOffset: { width: 0, height: 2 }, // For shadow on iOS
    shadowOpacity: 0.1, // For shadow on iOS
    shadowRadius: 4, // For shadow on iOS
    borderWidth: 1, // Optional for outline
    borderColor: "#e0e0e0", // Optional for outline
  },
  rowedy: {
    flexDirection: "row",
    alignItems: "flex-start", // Ensures proper alignment
    gap: 16, // Provides spacing between elements without forcing them apart
  },
  cardCointainer: {
    flexDirection: "row",
    alignItems: "flex-start", // Ensures proper alignment
    paddingRight: 30, // Give some padding to avoid cut-off
  },
  profileContainer: {
    width: 50,
    height: 50,
    borderRadius: 30, // Makes it circular
    overflow: "hidden", // Ensures the image stays within the circle
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6200ee", // Default background for initials
  },
  profileImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover", // Ensures the image covers the circle
  },
  initialsContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  list: {
    padding: 10,
  },
  emptyMessage: {
    textAlign: "center",
    fontSize: 16,
    color: "#888",
    marginVertical: 20,
  },
  buttonWrapper: {
    padding: 10, // Add padding for visibility
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    marginLeft: 2, // Adds spacing between icon and text
    marginRight: 2,
    fontSize: 14,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#6200ee",
  },
  footer: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,   // 👈 ensures it's always visible at bottom
    backgroundColor: "#fff",
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
});
