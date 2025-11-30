import { FlatList, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";
import AppbarComponent from "@/components/AppbarComponent";
import { FAB, Avatar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSociety } from "@/utils/SocietyContext";
import { db } from "@/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

interface AdminUser {
  userId: string;
  firstName: string;
  lastName: string;
  avatar?: string; // optional, if you store avatar URL
}

const AssignAdminRole = () => {
  useCustomBackHandler("/admin");
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { societyName } = useSociety();
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  useEffect(() => {
    // 🔹 Fetch admin user details
    const fetchAdmins = async () => {
      try {
        const societyRef = doc(db, "Societies", societyName);
        const societySnap = await getDoc(societyRef);
        if (societySnap.exists()) {
          const data = societySnap.data();
          const adminIds: string[] = data.admins || [];

          // Fetch each user's details
          const adminUsers: AdminUser[] = [];
          for (const userId of adminIds) {
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              adminUsers.push({
                userId,
                firstName: userData.firstName || "",
                lastName: userData.lastName || "",
                avatar: userData.avatar || undefined,
              });
            }
          }

          setAdmins(adminUsers);
        }
      } catch (error) {
        console.error("Error fetching admins:", error);
      }
    };
    fetchAdmins();
  }, [societyName]);

  // 🔹 Render each admin
  const renderAdmin = ({ item }: { item: AdminUser }) => {
    const userName = `${item.firstName} ${item.lastName}`;
    return (
      <View style={styles.adminRow}>
        {/* Avatar */}
        <Avatar.Text
          size={40}
          label={userName.charAt(0).toUpperCase() || "?"}
          style={styles.avatar}
        />
        <View>
          {/* Name */}
          <Text style={styles.adminName}>{userName}</Text>
          <View style={styles.adminRoleView}>
            <Text style={styles.adminRole}>Admin</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Appbar Component */}
      <AppbarComponent title="Admins" source="Admin" />

      <FlatList
        data={admins}
        keyExtractor={(item) => item.userId}
        renderItem={renderAdmin}
        contentContainerStyle={{ padding: 16 }}
      />
      {/* Floating Action Button */}
      <FAB
        style={[styles.fab, { bottom: insets.bottom }]}
        icon="plus"
        color="white" // Set the icon color to white
        onPress={() => {
          router.push("/admin/AssignAdminRole/AddAdmin");
        }}
      />
    </View>
  );
};

export default AssignAdminRole;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#6200ee", // Customize the color
  },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  avatar: {
    backgroundColor: "#6200ee",
    marginRight: 12,
  },
  adminName: {
    fontSize: 16,
    fontWeight: "500",
  },
  adminRoleView: {
    backgroundColor: "#6200ee",
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  adminRole: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
