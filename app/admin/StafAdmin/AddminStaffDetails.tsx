import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Linking,
} from "react-native";
import React, { useState } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";

import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";
import AppbarMenuComponent from "@/components/AppbarMenuComponent";
import { FontAwesome } from "@expo/vector-icons"; // Import Expo icons

const AddminStaffDetails = () => {
  const router = useRouter();
  const { societyName } = useSociety();
  const customStaffCollectionName = `staff_${societyName}`;

  const { item } = useLocalSearchParams();
  // Parse the passed item
  const profileItem = item ? JSON.parse(item as string) : {};
  const docId = profileItem.id;

  const hasImage =
    profileItem.selectedImageUrl && profileItem.selectedImageUrl.trim() !== "";
  const initials = profileItem.firstName
    ? profileItem.firstName.charAt(0).toUpperCase()
    : "?";

  const makeCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch((err) =>
      console.error("Error opening dialer:", err)
    );
  };

  const handleDelete = async (docId: string) => {
    return new Promise((resolve, reject) => {
      Alert.alert(
        "Confirm Deletion",
        "Are you sure you want to delete this document?",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => reject("Cancelled"),
          },
          {
            text: "Yes",
            onPress: () => {
              (async () => {
                try {
                  console.log("Deleting document:", docId);

                  // Construct Firestore document reference
                  const societyRef = `Societies/${societyName}`;
                  const societyDocRef = doc(db, societyRef);
                  const documentRef = doc(
                    societyDocRef,
                    customStaffCollectionName,
                    docId
                  );

                  // Delete document from Firestore
                  await deleteDoc(documentRef);

                  console.log("Document deleted successfully");

                  // Show success alert
                  Alert.alert("Success", "Document deleted successfully!", [
                    {
                      text: "OK",
                      onPress: () => router.replace("./"),
                    },
                  ]);
                } catch (error) {
                  console.error("Error deleting document:", error);
                  Alert.alert(
                    "Error",
                    "Failed to delete document. Please try again."
                  );
                  reject(error);
                }
              })(); // Immediately invoke async function inside onPress
            },
          },
        ]
      );
    });
  };

  const [menuVisible, setMenuVisible] = useState(false);
  const handleMenuOptionPress = async (option: string) => {
    if (option === "Delete") {
      try {
        await handleDelete(docId); // Wait for deletion to complete
        router.replace("../"); // Navigate only after deletion
      } catch (error) {
        console.error("Error in deletion process:", error);
      }
    }
    if (option === "Edit") {
      router.replace({
        pathname: "./AddAdminStaff",
        params: {
          item,
        }, // Pass item as a string
      }); // ✅ Corrected syntax
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
        <AppbarComponent
          title="Society Staff"
          source="Admin"
          onPressThreeDot={() => setMenuVisible(!menuVisible)}
        />
        {/* Three-dot Menu */}
        {/* Custom Menu */}
        {menuVisible && (
          <AppbarMenuComponent
            items={["Edit", "Delete"]}
            onItemPress={handleMenuOptionPress}
            closeMenu={closeMenu}
          />
        )}
        <View style={styles.profileImageContainer}>
          <View style={styles.profileContainer}>
            {hasImage ? (
              <Image
                source={{ uri: profileItem.selectedImageUrl }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.initialsContainer}>
                <Text style={styles.initialsText}>{initials}</Text>
              </View>
            )}
          </View>
        </View>
        <ScrollView style={styles.scrollContainer}>
          <Text style={styles.nameText}>
            {profileItem.firstName} {profileItem.lastName}
          </Text>
          <View style={styles.twoButtonRow}>
            <View style={styles.leftButton}>
              <FontAwesome name="calendar" size={24} color="#6200ee" />
              <Text style={styles.buttonText}>Attendance</Text>
            </View>
            <View style={styles.rightButton}>
              <FontAwesome name="phone" size={24} color="#6200ee" />
              <Text style={styles.buttonText}>Call</Text>
            </View>
          </View>

          {/* Phone */}

          <TouchableOpacity
            style={styles.buttonWrapper}
            onPress={() => {
              makeCall(profileItem.mobileNumber);
            }}
          >
            <View style={styles.innerButton}>
              <View style={{ marginVertical: 8 }}>
                <FontAwesome
                  name="phone"
                  size={30}
                  color="#2196F3"
                  style={styles.icon}
                />
              </View>
              <View style={{ marginVertical: 8 }}>
                <Text style={styles.mobileNumberText}>
                  {profileItem.mobileNumber}
                </Text>
                <Text style={styles.buttonText}>Mobile</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Services */}

          <View style={styles.services}>
            <View style={{ marginVertical: 8 }}>
              <FontAwesome
                name="briefcase"
                size={30}
                color="#2196F3"
                style={styles.icon}
              />
            </View>
            <View style={{ marginVertical: 8 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                {profileItem.selectedServices.map(
                  (service: string, index: number) => (
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
                  )
                )}
              </View>
              <Text style={styles.buttonText}>Services</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default AddminStaffDetails;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileImageContainer: {
    backgroundColor: "#6200ee",
    padding: 8,
  },
  scrollContainer: { padding: 1 },
  profileContainer: {
    width: 150,
    height: 150,
    borderRadius: 75, // Makes it circular
    overflow: "hidden", // Ensures the image stays within the circle
    justifyContent: "center",
    alignSelf: "center",
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
  nameText: {
    fontSize: 24,
    fontWeight: "bold",
    alignSelf: "center",
    marginVertical: 8,
  },
  twoButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderTopWidth: 1,
  },
  leftButton: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginHorizontal: 5,
    borderRightWidth: 1,
    flex: 1,
    alignItems: "center", // Center items vertically
    justifyContent: "center", // Center items inside the button
  },
  buttonText: {
    marginLeft: 2, // Adds spacing between icon and text
    marginRight: 2,
    fontSize: 14,
  },
  rightButton: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginHorizontal: 5,
    flex: 1,
    alignItems: "center", // Center items vertically
    justifyContent: "center", // Center items inside the button
  },
  buttonWrapper: {
    flex: 1, // Ensures each button wrapper takes equal space
  },
  innerButton: {
    flexDirection: "row", // Align icon and text horizontally
    borderBottomWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: "flex-start", // Ensures proper alignment
    gap: 24, // Provides spacing between elements without forcing them apart
  },
  icon: {
    marginHorizontal: 10, // Adds space around the icon
  },
  mobileNumberText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  services: {
    flexDirection: "row", // Align icon and text horizontally
    borderBottomWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: "center", // Center items vertically
    gap: 24, // Provides spacing between elements without forcing them apart
  },
});
