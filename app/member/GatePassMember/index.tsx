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
import { useRouter, Stack } from "expo-router";
import { useSociety } from "@/utils/SocietyContext";
import { FAB, Divider } from "react-native-paper";
import { collection, getDocs, doc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { FontAwesome, Ionicons } from "@expo/vector-icons"; // Import Expo icons
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Index = () => {
  const router = useRouter();
  const { societyName } = useSociety();
  const societyContext = useSociety();
  const insets = useSafeAreaInsets();

  // const customStaffCollectionName = `staff_${societyName}`;
  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;

  const customGatePassCollectionName = `gatePass_${societyName}`;

  // Determine params based on source
  const wing = societyContext.wing;
  const flatNumber = societyContext.flatNumber;
  const floorName = societyContext.floorName;

  const [gatePassData, setGatePassData] = useState<any[]>([]);

  const makeCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch((err) =>
      console.error("Error opening dialer:", err)
    );
  };

  useEffect(() => {
    const fetchGatePassData = async () => {
      try {
        // Construct Firestore references
        const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
        const flatDocRef = doc(db, flatRef);

        const gatePassCollectionRef = collection(
          flatDocRef,
          customGatePassCollectionName
        );
        // Fetch the staff
        const gatePassSnapshot = await getDocs(gatePassCollectionRef);

        // Extract data
        const gatePasses = gatePassSnapshot.docs.map((doc) => {
          const docPath = doc.ref.path;
          const pathSegments = docPath.split("/");

          return {
            id: doc.id,
            wing: pathSegments[3],
            floorName: pathSegments[5],
            flatNumber: pathSegments[7],
            gatePassDocPath: docPath,
            ...doc.data(),
          };
        });

        // Set state with staff data
        setGatePassData(gatePasses);
      } catch (error) {
        console.error("Error fetching Gate Pass data:", error);
      }
    };
    fetchGatePassData();
  }, [
    customFlatsSubcollectionName,
    customFloorsSubcollectionName,
    customGatePassCollectionName,
    customWingsSubcollectionName,
    flatNumber,
    floorName,
    societyName,
    wing,
  ]);

  const renderGatePassData = ({ item }: { item: any }) => {
    const hasImage =
      item.selectedImageUrl && item.selectedImageUrl.trim() !== "";
    const initials = item.name ? item.name.charAt(0).toUpperCase() : "?";
    // Check if the gate pass is expired
    const isExpired = new Date(item.validToDate.seconds * 1000) < new Date();
    const statusText = isExpired ? "Expired" : "Valid";
    const statusColor = isExpired ? "red" : "green";
    const borderColor = isExpired ? "red" : "green";

    return (
      <View style={styles.cardview}>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/member/GatePassMember/gatePassDetails",
              params: { item: JSON.stringify(item) },
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
            <View style={[styles.validity, { borderColor }]}>
              <Text style={{ color: statusColor, fontWeight: "bold" }}>
                {statusText}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <Divider style={{ backgroundColor: "#ccc", marginVertical: 8 }} />

        <View style={styles.row}>
          {/* Call Button */}
          <TouchableOpacity
            style={styles.buttonWrapper}
            onPress={() => {
              makeCall(item.mobileNumber);
            }}
          >
            <View style={styles.innerButton}>
              <FontAwesome name="phone" size={16} color="#6200ee" />
              <Text style={styles.buttonText}>Call</Text>
            </View>
          </TouchableOpacity>

          {/* Message Button */}
          <TouchableOpacity style={styles.buttonWrapper} onPress={() => {}}>
            <View style={styles.innerButton}>
              <Ionicons name="share-social-outline" size={24} color="black" />
              <Text style={styles.buttonText}>Share</Text>
            </View>
          </TouchableOpacity>
        </View>
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
      <FAB
        style={[styles.fab, { bottom: insets.bottom }]}
        icon="plus"
        color="white"
        onPress={() => router.push("/member/GatePassMember/AddGatePassMember")}
      />
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#2196F3",
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
    flex: 1, // Ensures each button wrapper takes equal space
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
  rowedy: {
    flexDirection: "row",
    alignItems: "flex-start", // Ensures proper alignment
    gap: 16, // Provides spacing between elements without forcing them apart
  },
  validity: {
    borderWidth: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 2,
  },
  code: {
    borderWidth: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 2,
    alignSelf: "flex-start",
  },
});
