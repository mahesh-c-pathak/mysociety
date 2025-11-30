import React from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { logout } from "@/authService"; // ✅ your central logout function
import { useRouter } from "expo-router";
import { useAuthRole } from "@/lib/authRole";

interface Props {
  navigation: any;
}

export default function CustomDrawerContent(props: Props) {
  const router = useRouter();
  const { userName } = useAuthRole();

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await logout(); // ✅ Firebase signOut
              router.replace("/login"); // redirect to login
            } catch (error: any) {
              Alert.alert("Logout Failed", error.message);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="account" size={60} color="white" />
        </View>
        <Text style={styles.name}>{userName}</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menu}>
        <DrawerItem
          label="Profile"
          icon={({ size, color }) => (
            <MaterialCommunityIcons
              name="account-outline"
              size={size}
              color={color}
            />
          )}
          onPress={() => props.navigation.navigate("profile")}
        />

        <DrawerItem
          label="Change Password"
          icon={({ size, color }) => (
            <MaterialCommunityIcons
              name="key-outline"
              size={size}
              color={color}
            />
          )}
          onPress={() => props.navigation.navigate("changepassword")}
        />
        <DrawerItem
          label="Contact us"
          icon={({ size, color }) => (
            <MaterialCommunityIcons
              name="message-text-outline"
              size={size}
              color={color}
            />
          )}
          onPress={() => props.navigation.navigate("contact")}
        />
        <DrawerItem
          label="Feedback"
          icon={({ size, color }) => (
            <MaterialCommunityIcons
              name="chat-outline"
              size={size}
              color={color}
            />
          )}
          onPress={() => props.navigation.navigate("feedback")}
        />
        <DrawerItem
          label="About us"
          icon={({ size, color }) => (
            <MaterialCommunityIcons
              name="information-outline"
              size={size}
              color={color}
            />
          )}
          onPress={() => props.navigation.navigate("about")}
        />
        <DrawerItem
          label="Terms and Conditions"
          icon={({ size, color }) => (
            <MaterialCommunityIcons
              name="file-document-outline"
              size={size}
              color={color}
            />
          )}
          onPress={() => props.navigation.navigate("terms")}
        />
        <DrawerItem
          label="Privacy Policy"
          icon={({ size, color }) => (
            <MaterialCommunityIcons
              name="shield-lock-outline"
              size={size}
              color={color}
            />
          )}
          onPress={() => props.navigation.navigate("privacypolicy")}
        />

        {/* Logout */}
        <DrawerItem
          label="Logout"
          icon={({ size, color }) => (
            <MaterialCommunityIcons name="logout" size={size} color={color} />
          )}
          onPress={handleLogout}
        />
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#03A9F4",
    paddingVertical: 40,
    alignItems: "center",
  },
  avatar: {
    backgroundColor: "#0288D1",
    borderRadius: 50,
    padding: 10,
    marginBottom: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  menu: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: 10,
  },
});
