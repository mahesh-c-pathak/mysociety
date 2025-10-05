import React from 'react'
import {
  View,
  StyleSheet,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FAB,
} from "react-native-paper";

const Schedules = () => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
  return (
    <View style={styles.container}>
      <Text>Schedules</Text>
      <View
        style={[
                styles.footer,
                { bottom: insets.bottom },
        ]}
        >
            {/* Floating Action Button */}
        <FAB
          icon="plus"
          color="white" // Set the icon color to white
          style={styles.fab}
          onPress={() => router.push("/admin/Bills/Maintenance/CreateScheduledBill")} // Example route for adding a bill
        />

        </View>
    </View>
  )
}

export default Schedules

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFFFFF" },
    fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#6200ee",
  },
  footer: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,   // 👈 ensures it's always visible at bottom
    backgroundColor: "#fff",
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },

});