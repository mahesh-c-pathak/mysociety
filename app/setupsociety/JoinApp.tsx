// app/building-maintenance.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";

import AppbarComponent from "@/components/AppbarComponent";
import { globalStyles } from "@/styles/globalStyles";

const JoinApp = () => {
  const router = useRouter();

  const { height } = useWindowDimensions();
  // Dynamically calculate spacing
  const spacing = height * 0.1; // 5% of screen height

  return (
    <View style={globalStyles.container}>
      {/* Top Appbar */}

      <AppbarComponent title="Join App" />

      <View
        style={[styles.card, { marginTop: spacing, marginBottom: spacing }]}
      >
        <Text style={styles.description}>
          Obtain your joining code from the building administrator. Click Join
          Building, select your block, and effortlessly connect with your
          neighbors. Enhance your community experience today.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/setupsociety/joinbuilding")}
        >
          <Text style={styles.buttonText}>Join your Building</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { marginBottom: spacing }]}>
        <Text style={styles.description}>
          If your building isn’t listed, take the initiative to create a new
          one. Shape a vibrant community and explore our smart building
          maintenance feature for seamless living. Join the journey toward
          modern living today.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/setupsociety/requesttrial")}
        >
          <Text style={styles.buttonText}>Create New Building</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default JoinApp;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  description: {
    fontSize: 14,
    color: "#555",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
