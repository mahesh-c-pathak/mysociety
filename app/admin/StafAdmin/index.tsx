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
import { FAB, Divider } from "react-native-paper";
import { collection, getDocs, doc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";
import { FontAwesome } from "@expo/vector-icons"; // Import Expo icons
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LoadingIndicator from "@/components/LoadingIndicator"; // new import

const Index = () => {
  const router = useRouter();
  const { societyName } = useSociety();
  const insets = useSafeAreaInsets();

  const customStaffCollectionName = `staff_${societyName}`;
  const [loading, setLoading] = useState(false);

  const [adminStaffData, setAdminStaffData] = useState<any[]>([]);

  const makeCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch((err) =>
      console.error("Error opening dialer:", err)
    );
  };

  const sendMessage = (phoneNumber: string) => {
    const url = `sms:${phoneNumber}`;
    Linking.openURL(url).catch((err) =>
      console.error("Error opening messaging app:", err)
    );
  };

  useEffect(() => {
    const fetchAdiminStaff = async () => {
      try {
        setLoading(true);
        // Construct Firestore references
        const societyRef = `Societies/${societyName}`;
        const societyDocRef = doc(db, societyRef);
        const adminStaffCollectionRef = collection(
          societyDocRef,
          customStaffCollectionName
        );
        // Fetch the staff
        const adminStaffSnapshot = await getDocs(adminStaffCollectionRef);

        // Extract data
        const adminStaffs = adminStaffSnapshot.docs.map((doc) => {
          const docPath = doc.ref.path;
          return {
            id: doc.id,
            adminStaffDocPath: docPath,
            ...doc.data(),
          };
        });

        // Set state with staff data
        setAdminStaffData(adminStaffs);
      } catch (error) {
        console.error("Error fetching admin staff data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAdiminStaff();
  }, [customStaffCollectionName, societyName]);

  const renderAdminStaff = ({ item }: { item: any }) => {
    const hasImage =
      item.selectedImageUrl && item.selectedImageUrl.trim() !== "";
    const initials = item.firstName
      ? item.firstName.charAt(0).toUpperCase()
      : "?";

    return (
      <View style={styles.cardview}>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/admin/StafAdmin/AddminStaffDetails",
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

          {/* Attendance Button */}
          <TouchableOpacity
            style={styles.buttonWrapper}
            onPress={() =>
              router.push({
                pathname: "/admin/StafAdmin/staffAttendance",
                params: { staffId: item.id }, // 👈 pass staffId
              })
            }
          >
            <View style={styles.innerButton}>
              <FontAwesome name="calendar" size={16} color="#6200ee" />
              <Text style={styles.buttonText}>Attendance</Text>
            </View>
          </TouchableOpacity>

          {/* Message Button */}
          <TouchableOpacity
            style={styles.buttonWrapper}
            onPress={() => sendMessage(item.mobileNumber)}
          >
            <View style={styles.innerButton}>
              <FontAwesome name="paper-plane" size={16} color="#6200ee" />
              <Text style={styles.buttonText}>Message</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppbarComponent title="Society Staff" source="Admin" />
      <FlatList
        data={adminStaffData}
        renderItem={renderAdminStaff}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyMessage}>No staff</Text>}
      />
      <FAB
        style={[styles.fab, { bottom: insets.bottom }]}
        icon="plus"
        color="white"
        onPress={() => router.push("/admin/StafAdmin/AddAdminStaff")}
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
    backgroundColor: "#6200ee",
  },
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
});
