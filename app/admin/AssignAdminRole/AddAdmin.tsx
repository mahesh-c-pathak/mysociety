import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import React from "react";
import AppbarComponent from "@/components/AppbarComponent";
import { useRouter } from "expo-router";

const AddAdmin = () => {
  const router = useRouter();
  return (
    <View style={styles.container}>
      {/* Appbar Component */}
      <AppbarComponent title="Add Admin" source="Admin" />
      <TouchableOpacity
        onPress={() =>
          router.push("/admin/AssignAdminRole/AddFromSocietyMembers")
        }
        style={[styles.button, { backgroundColor: "#6200ee" }]}
      >
        <Text style={styles.text}>Add From Society Members</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/admin")}
        style={[styles.button, { backgroundColor: "grey" }]}
      >
        <Text style={styles.text}>Add New</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddAdmin;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  text: {
    color: "#fff", // White text
    fontSize: 16,
    fontWeight: "bold",
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 32,
    marginHorizontal: 32,
  },
});
