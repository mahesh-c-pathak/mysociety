import React, { useEffect } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, IconButton, FAB, Card, Appbar } from "react-native-paper";
import { useRouter, useNavigation } from "expo-router";
import type { LinkProps } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BalanceSheetScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gridData:{ label: string; icon: string; route?: LinkProps["href"]; value?: string }[] = [
    { label: "Ledger Accounts", icon: "book", route: "/admin/Accounting/LedgerAccountsScreen" },
    { label: "Vouchers", icon: "file-document", route: "/admin/Accounting/Vouchers" }, 
    { label: "Transactions", icon: "eye", route: "/admin/Accounting/TransactionScreen" },
    { label: "Reports", icon: "chart-line", route: "/admin/Accounting/Reports" },
    { label: "Opening Balances", icon: "pencil" },
    { label: "Cash", icon: "file-document", value: "0.00" },
    { label: "Bank", icon: "file-document", value: "2000.00" },
    { label: "Total Balance", icon: "file-document", value: "2000.00" },
  ];

  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({
        headerTitle:"Balance Sheet",
    })
  }, []);

  return (
    <View style={styles.container}>
      {/* Top Appbar */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content title="Balance Sheet" titleStyle={styles.titleStyle} />
      </Appbar.Header>

      {/* Main Balance Section */}
      <Card style={styles.card}>
        <Card.Content>
          {/* Title with dots icon */}
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>Main Balance</Text>
            <IconButton
              icon="dots-vertical"
              onPress={() => {}}
              size={20}
              style={styles.iconButton}
            />
          </View>

          {/* Grid */}
          <View style={styles.grid}>
            {gridData.map((item, index) => (
              <TouchableOpacity key={index} style={styles.gridItem}
              onPress={() => {
                if (item.route) {
                  router.push(item.route); // Navigate to the respective screen
                }
              }}
              
              >
                <IconButton icon={item.icon} size={24} />
                <Text style={styles.gridLabel}>{item.label}</Text>
                {item.value && <Text style={styles.gridValue}>{item.value}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </Card.Content>
      </Card>

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
          // Handle FAB action
        }}
      />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: { backgroundColor: "#6200ee" },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },

  headerTitle: {
    fontSize: 18,
    color: "#fff",
  },
  card: {
    margin: 16,
    borderRadius: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 8, // Add padding to align content inside the card
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  iconButton: {
    margin: 0, // Remove unnecessary margins to keep the icon aligned properly
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: "22%",
    alignItems: "center",
    marginVertical: 8,
  },
  gridLabel: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 12,
  },
  gridValue: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 12,
    color: "#6200ee",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
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

export default BalanceSheetScreen;
