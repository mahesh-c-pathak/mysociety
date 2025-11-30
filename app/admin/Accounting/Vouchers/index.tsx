import React from "react";
import { StyleSheet, View, FlatList } from "react-native";
import { Card, Text, useTheme, Appbar } from "react-native-paper";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type MaterialCommunityIconName = React.ComponentProps<
  typeof MaterialCommunityIcons
>["name"];

type ValidRoutes =
  | "/admin/Accounting/Vouchers/Expense"
  | "/admin/Accounting/Vouchers/Income"
  | "/admin/Accounting/Vouchers/Receipt"
  | "/admin/Accounting/Vouchers/Purchase"
  | "/admin/Accounting/Vouchers/Cash-Withdrawal"
  | "/admin/Accounting/Vouchers/Cash-Deposit"
  | "/admin/Accounting/Vouchers/Cash-To-Cash-Transfer"
  | "/admin/Accounting/Vouchers/Bank-To-Bank-Transfer"
  | "/admin/Accounting/Vouchers/Journal";

type VoucherItem = {
  id: string;
  title: string;
  icon: MaterialCommunityIconName; // Use the correct type for MaterialCommunityIcons
  route: ValidRoutes; // Use a union of valid route strings
};

const vouchers: VoucherItem[] = [
  {
    id: "1",
    title: "Expense",
    icon: "credit-card",
    route: "/admin/Accounting/Vouchers/Expense",
  },
  {
    id: "2",
    title: "Income",
    icon: "cash",
    route: "/admin/Accounting/Vouchers/Income",
  },
  {
    id: "3",
    title: "Receipt",
    icon: "receipt",
    route: "/admin/Accounting/Vouchers/Receipt",
  },
  {
    id: "4",
    title: "Purchase",
    icon: "cart",
    route: "/admin/Accounting/Vouchers/Purchase",
  },
  {
    id: "5",
    title: "Cash Withdrawal",
    icon: "arrow-up",
    route: "/admin/Accounting/Vouchers/Cash-Withdrawal",
  },
  {
    id: "6",
    title: "Cash Deposit",
    icon: "arrow-down",
    route: "/admin/Accounting/Vouchers/Cash-Deposit",
  },
  {
    id: "7",
    title: "Cash to Cash Transfer",
    icon: "swap-horizontal",
    route: "/admin/Accounting/Vouchers/Cash-To-Cash-Transfer",
  },
  {
    id: "8",
    title: "Bank to Bank Transfer",
    icon: "bank",
    route: "/admin/Accounting/Vouchers/Bank-To-Bank-Transfer",
  },
  {
    id: "9",
    title: "Journal",
    icon: "book",
    route: "/admin/Accounting/Vouchers/Journal",
  },
];

const Index: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();

  const renderItem = ({ item }: { item: VoucherItem }) => (
    <Card
      style={styles.card}
      onPress={() => router.push(item.route)} // Navigate to the route when pressed
    >
      <Card.Content style={styles.cardContent}>
        <MaterialCommunityIcons
          name={item.icon}
          size={32}
          color={theme.colors.primary}
        />
        <Text style={styles.cardText}>{item.title}</Text>
      </Card.Content>
    </Card>
  );
  return (
    <View style={styles.container}>
      {/* Top Appbar */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content title="Vouchers" titleStyle={styles.titleStyle} />
      </Appbar.Header>

      <FlatList
        data={vouchers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={3} // Display 3 items per row
        contentContainerStyle={styles.grid}
      />
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
  grid: {
    justifyContent: "space-between",
  },
  card: {
    flex: 1,
    margin: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 120,
    borderRadius: 8,
    elevation: 2,
  },
  cardContent: {
    alignItems: "center",
  },
  cardText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
  },
});

export default Index;
