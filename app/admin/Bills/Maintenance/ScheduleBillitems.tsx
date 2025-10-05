import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { List, FAB } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  collection,
  onSnapshot,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/firebaseConfig"; // Adjust the path to your Firebase config file
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppbarComponent from "../../../../components/AppbarComponent";
import { useSociety } from "@/utils/SocietyContext";

// Define TypeScript type for a bill item
interface BillItem {
  id: string;
  itemName: string;
  notes?: string;
  type?: string;
  ownerAmount?: string;
  rentAmount?: string;
  closedUnitAmount?: string;
}

const ScheduleBillitems: React.FC = () => {
  const router = useRouter();
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { societyName } = useSociety();
  const specialBillitemCollectionName = `specialBillitems_${societyName}`;

  // Fetch Bill Items from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "Societies", societyName, specialBillitemCollectionName),
      (snapshot) => {
        const items = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
          id: doc.id,
          ...doc.data(),
        })) as BillItem[];
        setBillItems(items);
      },
      (error) => {
        console.error("Error fetching bill items: ", error);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [params.id, societyName, specialBillitemCollectionName]);

  // Navigate to Update Bill Page
  const handleItemPress = (item: BillItem) => {
    router.push({
      pathname: "/admin/Bills/Maintenance/AddScheduleBillItem", // Adjust this path based on your routing structure
      params: item as any, // Cast to `any` to bypass the type error
    });
  };

  // Navigate to Add Bill Item Page
  const handleAddItemPress = () => {
    router.push("/admin/Bills/Maintenance/AddScheduleBillItem"); // Adjust this path to match the Add Bill Item page route
  };

  return (
    <View style={styles.container}>
      {/* Top Appbar */}
      <AppbarComponent title="Schedule Bill Items" source="Admin" />
      {/* List of Bill Items */}
      <FlatList
        data={billItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleItemPress(item)}>
            <List.Item
              title={item.itemName}
              right={() => <List.Icon icon="chevron-right" />}
              style={styles.listItem}
            />
          </TouchableOpacity>
        )}
      />

      {/* Floating Action Button */}
      <View style={[styles.footer, { bottom: insets.bottom }]}>
        <FAB icon="plus" style={styles.fab} onPress={handleAddItemPress} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  listItem: {
    backgroundColor: "#ffffff",
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 5,
    elevation: 2,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#6200ee", // Change to match your theme
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0, // 👈 ensures it's always visible at bottom
    backgroundColor: "#fff",
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
});

export default ScheduleBillitems;
