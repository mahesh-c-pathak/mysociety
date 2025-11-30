import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import React from "react";
import { globalStyles } from "@/styles/globalStyles";
import { useLocalSearchParams, useRouter } from "expo-router";
import AppbarComponent from "@/components/AppbarComponent";
import { Divider, IconButton } from "react-native-paper";

const FlatMemberHistoryDetails = () => {
  const router = useRouter();
  const { itemdetail, parsedwing, parsedflatNumber } = useLocalSearchParams();

  // ✅ Helper to format Firestore timestamp or ISO string
  const formatDate = (dateValue: any) => {
    if (!dateValue) return "—";
    const date =
      typeof dateValue === "string"
        ? new Date(dateValue)
        : dateValue.toDate?.() || new Date(dateValue);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const parsedItemDetail = JSON.parse(itemdetail as string);
  const parsedMobileNumber = parsedItemDetail.usermobileNumber;

  const formattedStart = formatDate(parsedItemDetail.startDate);
  const formattedEnd = formatDate(parsedItemDetail.endDate);
  const userType = parsedItemDetail.userType;
  return (
    <View style={globalStyles.container}>
      <AppbarComponent
        title={`${parsedwing} ${parsedflatNumber}`}
        source="Admin"
      />
      {/* Profile */}
      <View style={styles.profileContainer}>
        <TouchableOpacity
          style={[styles.profileImageContainer, { backgroundColor: "#fff" }]}
        >
          <IconButton icon="account" size={80} />
        </TouchableOpacity>
      </View>

      {/* Name */}

      <View style={styles.nameContainer}>
        <Text style={styles.name}>{parsedItemDetail.userName}</Text>
      </View>

      <Divider />
      {/* Phone */}

      <View style={styles.optionsContainer}>
        <View style={styles.row}>
          <IconButton icon="phone" iconColor="#6200ee" onPress={() => {}} />
          <View>
            <Text style={styles.info}>{parsedMobileNumber}</Text>
            <Text style={styles.label}>Mobile</Text>
          </View>
        </View>
      </View>
      <Divider />
      <View style={styles.optionsContainer}>
        <View style={styles.row}>
          <IconButton
            icon="clock-outline"
            iconColor="#6200ee"
            onPress={() => {}}
          />
          <View>
            <Text style={styles.info}>
              {formattedStart} - {formattedEnd}
            </Text>
            <Text style={styles.label}>Duration</Text>
          </View>
        </View>
      </View>
      <Divider />

      <View style={styles.optionsContainer}>
        <View style={styles.row}>
          <IconButton icon="account" iconColor="#6200ee" onPress={() => {}} />
          <View>
            <Text style={styles.info}>{userType}</Text>
          </View>
        </View>
      </View>
      <Divider />
    </View>
  );
};

const styles = StyleSheet.create({
  profileContainer: {
    alignItems: "center",
    paddingVertical: 5,
    backgroundColor: "#6200ee",
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    // color: "#fff",
  },
  nameContainer: {
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally
    height: 50, // Set a fixed height
    paddingVertical: 8,
    width: "100%", // Ensure it takes full width of the screen
    backgroundColor: "#f5f5f5", // Optional for debugging
  },
  info: {
    fontSize: 16,
    //color: "#fff",
  },
  label: {
    fontSize: 14,
    //color: "#fff",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionsContainer: {
    marginTop: 10,
  },
});

export default FlatMemberHistoryDetails;
