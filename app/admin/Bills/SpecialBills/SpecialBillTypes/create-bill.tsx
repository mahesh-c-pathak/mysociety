import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, FAB, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CreateBill = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      {/* Icon and Text */}
      <View style={styles.content}>
        <IconButton icon="file-document-outline" size={50} />
        <Text style={styles.message}>
          Create variable bills, fixed bills according to utility consumption
        </Text>
      </View>

      {/* Floating Action Button */}
      <View
        style={[
          styles.footer,
          { bottom: insets.bottom },
        ]}
      >
      <FAB
        style={styles.fab}
        icon="plus"
        color="white" // Set the icon color to white
        onPress={() => {
          router.push("/admin/Bills/SpecialBills/CreateSpecialBill");
        }}        
      />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    color: '#616161', // Adjust the color as needed
  },
  message: {
    textAlign: 'center',
    fontSize: 16,
    color: '#616161',
    paddingHorizontal: 20,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#6200ee', // Customize the color
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

export default CreateBill