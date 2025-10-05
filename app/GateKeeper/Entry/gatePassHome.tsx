import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import { useRouter, Stack } from "expo-router";

import {
  getDocs,
  collectionGroup,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";

const GatePassHome = () => {
  const router = useRouter();
  const { societyName } = useSociety();
  const customGatePassCollectionName = `gatePass_${societyName}`;

  const [gatePassData, setGatePassData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAllGatePasses = async () => {
    setLoading(true);
    try {
      const currentDate = Timestamp.fromDate(new Date()); // Convert current date to Firestore timestamp

      // Firestore Query: Fetch documents where validToDate is today or in the past, sorted in ascending order
      const gatePassesQuery = query(
        collectionGroup(db, customGatePassCollectionName),
        where("validToDate", ">=", currentDate), // Fetch where validToDate is today or in the future
        orderBy("validToDate", "asc") // Sort in ascending order
      );

      const gatePassesSnapshot = await getDocs(gatePassesQuery);

      const gatePasses = gatePassesSnapshot.docs.map((doc) => {
        const docData = doc.data();
        const docPath = doc.ref.path;
        const pathSegments = docPath.split("/");

        return {
          id: doc.id,
          wing: pathSegments[3],
          floorName: pathSegments[5],
          flatNumber: pathSegments[7],
          gatePassDocPath: docPath,
          validToDate: docData.validToDate
            ? docData.validToDate.toDate()
            : null, // Convert Firestore Timestamp to Date
          ...docData, // Include other Firestore fields
        };
      });

      // Set state with sorted gate passes
      setGatePassData(gatePasses);
    } catch (error) {
      console.error("Error fetching Checked In Visitors data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllGatePasses();
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const renderGatePassData = ({ item }: { item: any }) => {
    const hasImage =
      item.selectedImageUrl && item.selectedImageUrl.trim() !== "";
    const initials = item.name ? item.name.charAt(0).toUpperCase() : "?";
    // Check if the gate pass is expired

    return (
      <View style={styles.cardview}>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "./addVisitor",
              params: {
                wing: item.wing,
                floorName: item.floorName,
                flatNumber: item.flatNumber,
                item: JSON.stringify(item),
              },
            })
          }
        >
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
              <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
              <Text style={{ marginBottom: 8 }}>{item.mobileNumber}</Text>
              <View style={styles.code}>
                <Text style={{ color: "green" }}>Code: {item.id}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppbarComponent title="Gate Pass" />
      <FlatList
        data={gatePassData}
        renderItem={renderGatePassData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyMessage}>No Daily Helpers added</Text>
        }
      />
    </View>
  );
};

export default GatePassHome;

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
  profileContainer: {
    width: 50,
    height: 50,
    borderRadius: 30, // Makes it circular
    overflow: "hidden", // Ensures the image stays within the circle
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#007AFF", // Default background for initials
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
  code: {
    borderWidth: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 2,
    alignSelf: "flex-start",
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
});
