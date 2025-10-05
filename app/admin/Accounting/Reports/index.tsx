import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, IconButton, Card, Appbar } from "react-native-paper";
import { useRouter } from "expo-router";
import type { LinkProps } from "expo-router";

const ReportsScreen = () => {
  const router = useRouter();
  const gridData:{ label: string; icon: string; route?: LinkProps["href"]; value?: string }[] = [
    { label: "BalanceSheet", icon: "book", route: "/admin/Accounting/Reports/BalanceSheet" },
    { label: "Income And Expenditure", icon: "file-document", route: "/admin/Accounting/Reports/Income-And-Expenditure" },
    { label: "Receipt Summary", icon: "file-document", route: "/admin/Accounting/Reports/ReceiptSummary" },
    { label: "Cash Book", icon: "eye", route: "/admin/Accounting/Reports/CashBook" },
    { label: "Bank Book", icon: "chart-line", route: "/admin/Accounting/Reports/BankBook" },
    
    
  ];

  return (
    <View style={styles.container}>

      {/* Top Appbar */}
      <Appbar.Header style={styles.header}>
            <Appbar.BackAction onPress={() => router.back()} color="#fff" />
            <Appbar.Content title="Reports" titleStyle={styles.titleStyle} />
          </Appbar.Header>
      

      {/* Main Balance Section */}
      <Card style={styles.card}>
        <Card.Content>
          {/* Title with dots icon */}
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>Reports</Text>
            
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

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: { backgroundColor: "#6200ee" },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  
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
});

export default ReportsScreen;
