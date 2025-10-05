import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Image,
  Linking,
} from "react-native";
import React, { useState, useEffect } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import { Stack } from "expo-router";
import { Divider } from "react-native-paper";
import { getDocs, collectionGroup, query } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";
import { FontAwesome } from "@expo/vector-icons"; // Import Expo icons

const Index = () => {
  const { societyName } = useSociety();

  const customDailyHelperCollectionName = `dailyhelper_${societyName}`;

  const [adminStaffData, setAdminStaffData] = useState<any[]>([]);

  const makeCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch((err) =>
      console.error("Error opening dialer:", err)
    );
  };

  const fetchAllDailyHelpers = async () => {
    try {
      // Construct Firestore references
      // Query: Fetch all Daily Helpers
      const dealyHelpersQuery = query(
        collectionGroup(db, customDailyHelperCollectionName)
      );

      // Fetch the Daily Helpers
      const dailyHelperSnapshot = await getDocs(dealyHelpersQuery);

      // Extract data
      const dailyHelpers = dailyHelperSnapshot.docs.map((doc) => {
        const docPath = doc.ref.path;
        const pathSegments = docPath.split("/");
        return {
          id: doc.id,
          wing: pathSegments[3],
          floorName: pathSegments[5],
          flatNumber: pathSegments[7],
          adminStaffDocPath: docPath,
          ...doc.data(),
        };
      });

      // Set state with staff data
      setAdminStaffData(dailyHelpers);
    } catch (error) {
      console.error("Error fetching admin staff data:", error);
    }
  };

  useEffect(() => {
    fetchAllDailyHelpers();
  }, []);

  const renderDailyHelper = ({ item }: { item: any }) => {
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
              <Text style={{ fontWeight: "bold" }}>
                {item.firstName} {item.lastName}
              </Text>
              <Text style={{ marginBottom: 8 }}>{item.mobileNumber}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                {item.selectedServices.map((service: string, index: number) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: "#6200ee",
                      padding: 5,
                      borderRadius: 2,
                      alignSelf: "flex-start", // Adjust width based on content
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      {service}
                    </Text>
                  </View>
                ))}
              </View>
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

        <Divider style={{ backgroundColor: "#ccc", marginVertical: 8 }} />

        <View style={styles.row}>
          {/* Wing and Flat of Daily Helper */}

          <View
            style={{
              backgroundColor: "#6200ee",
              padding: 5,
              borderRadius: 2,
              alignSelf: "flex-start", // Adjust width based on content
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>
              {item.wing} {item.flatNumber}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppbarComponent title="Daily Helper" source="Admin" />
      <FlatList
        data={adminStaffData}
        renderItem={renderDailyHelper}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyMessage}>No Daily Helpers added</Text>
        }
      />
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  loader: { marginTop: 20 },
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  innerButton: {
    flexDirection: "row", // Align icon and text horizontally
    alignItems: "center", // Center items vertically
    justifyContent: "center", // Center items inside the button
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginHorizontal: 5,
    borderRadius: 2,
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
});
