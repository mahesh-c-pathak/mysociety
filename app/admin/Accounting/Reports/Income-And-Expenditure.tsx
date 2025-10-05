import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Text,
  Card,
  Button,
  Divider,
  TextInput,
  Chip,
} from "react-native-paper";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";

import AppbarComponent from "@/components/AppbarComponent";
import AppbarMenuComponent from "@/components/AppbarMenuComponent";

interface Transaction {
  paidFrom: string;
  paidTo: string;
  amount: number;
  type: string;
}

interface AccountData {
  account: string;
  amount: number;
}

const IncomeAndExpenditureScreen: React.FC = () => {
  
  const [startDate, setStartDate] = useState("2024-11-01");
  const [endDate, setEndDate] = useState("2024-11-27");
  const [IncomeOptions, setIncomeOptions] = useState<string[]>([]);
  const [ExpenseOptions, setExpenseOptions] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomeData, setIncomeData] = useState<AccountData[]>([]);
  const [expenseData, setExpenseData] = useState<AccountData[]>([]);

  useEffect(() => {
    const fetchAccountOptions = async () => {
      try {
        const ledgerGroupsRef = collection(db, "ledgerGroups");

        // Fetch Income Accounts
        const fromQuerySnapshot = await getDocs(
          query(
            ledgerGroupsRef,
            where("name", "in", ["Direct Income", "Indirect Income"])
          )
        );
        const fromAccounts = fromQuerySnapshot.docs
          .map((doc) => doc.data().accounts || [])
          .flat()
          .filter((account) => account.trim() !== "");
        setIncomeOptions(fromAccounts);

        // Fetch Expense Accounts
        const toQuerySnapshot = await getDocs(
          query(
            ledgerGroupsRef,
            where("name", "in", [
              "Direct Expenses",
              "Indirect Expenses",
              "Maintenance & Repairing",
            ])
          )
        );
        const toAccounts = toQuerySnapshot.docs
          .map((doc) => doc.data().accounts || [])
          .flat()
          .filter((account) => account.trim() !== "");
        setExpenseOptions(toAccounts);
      } catch (error) {
        console.error("Error fetching account options:", error);
        Alert.alert("Error", "Failed to fetch account options.");
      }
    };

    const fetchTransactions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Transaction"));
        const transactionData: Transaction[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          transactionData.push({
            paidFrom: data.paidFrom,
            paidTo: data.paidTo,
            amount: data.amount,
            type: data.type,
          });
        });

        setTransactions(transactionData);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      }
    };

    fetchAccountOptions();
    fetchTransactions();
  }, []);

  useEffect(() => {
    console.log("IncomeOptions", IncomeOptions);
  }, [IncomeOptions]);

  useEffect(() => {
    // Calculate Income Totals
    if (IncomeOptions.length > 0 && transactions.length > 0) {
      const accountBalances: Record<string, number> = {};

      IncomeOptions.forEach((account) => {
        accountBalances[account] = 0;
      });

      transactions.forEach((txn) => {
        if (IncomeOptions.includes(txn.paidFrom)) {
          accountBalances[txn.paidFrom] -= txn.amount;
        }
        if (IncomeOptions.includes(txn.paidTo)) {
          accountBalances[txn.paidTo] += txn.amount;
        }
      });

      const incomeTotals = Object.keys(accountBalances)
        .map((account) => ({
          account,
          amount: accountBalances[account],
        }))
        .filter((item) => item.amount !== 0);

      setIncomeData(incomeTotals);
    }
  }, [IncomeOptions, transactions]);

  useEffect(() => {
    // Calculate Expense Totals
    if (ExpenseOptions.length > 0 && transactions.length > 0) {
      const accountBalances: Record<string, number> = {};

      ExpenseOptions.forEach((account) => {
        accountBalances[account] = 0;
      });

      transactions.forEach((txn) => {
        if (ExpenseOptions.includes(txn.paidFrom)) {
          accountBalances[txn.paidFrom] -= txn.amount;
        }
        if (ExpenseOptions.includes(txn.paidTo)) {
          accountBalances[txn.paidTo] += txn.amount;
        }
      });

      const expenseTotals = Object.keys(accountBalances)
        .map((account) => ({
          account,
          amount: accountBalances[account],
        }))
        .filter((item) => item.amount !== 0);

      setExpenseData(expenseTotals);
    }
  }, [ExpenseOptions, transactions]);

  const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenseData.reduce((sum, item) => sum + item.amount, 0);

  const [menuVisible, setMenuVisible] = useState(false);
  const handleMenuOptionPress = (option: string) => {
    console.log(`${option} selected`);
    if (option === "Download PDF") {
      generatePDF();
    }
    setMenuVisible(false);
  };
  const closeMenu = () => {
    setMenuVisible(false);
  };

  const generatePDF = async () => {
    console.log("Generate PDF pressed");
  };

  return (
    <View style={styles.container}>
      {/* Top Appbar */}
      <AppbarComponent
        title="Income And Expenditure"
        source="Admin"
        onPressThreeDot={() => setMenuVisible(!menuVisible)}
      />

      {/* Three-dot Menu */}
      {/* Custom Menu */}
      {menuVisible && (
        <AppbarMenuComponent
          items={["Download PDF"]}
          onItemPress={handleMenuOptionPress}
          closeMenu={closeMenu}
        />
      )}

      <ScrollView style={styles.scrollcontainer}>
        {/* Header Section */}
        <View style={styles.scrollheader}>
          <Chip mode="outlined">FY: 2023-24</Chip>
          <Chip mode="outlined">FY: 2022-23</Chip>
          <Chip mode="outlined">FY: 2021-22</Chip>
          <Chip mode="outlined">FY: 2020-21</Chip>
        </View>

        {/* Date Range Section */}
        <View style={styles.dateSection}>
          <TextInput
            mode="outlined"
            label="Start Date"
            value={startDate}
            onChangeText={setStartDate}
            style={styles.dateInput}
          />
          <TextInput
            mode="outlined"
            label="End Date"
            value={endDate}
            onChangeText={setEndDate}
            style={styles.dateInput}
          />
          <Button mode="contained" style={styles.goButton}>
            Go
          </Button>
        </View>

        {/* Bank and Cash Details */}
        <View style={styles.cardSection}>
          <Card style={styles.card}>
            <Card.Content>
              <Text>Bank</Text>
              <Text>Opening Bal: ₹ 0.00</Text>
              <Text>Closing Bal: ₹ -29000.00</Text>
            </Card.Content>
          </Card>
          <Card style={styles.card}>
            <Card.Content>
              <Text>Cash</Text>
              <Text>Opening Bal: ₹ 0.00</Text>
              <Text>Closing Bal: ₹ -3500.00</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Income Section */}
        <Text style={styles.sectionTitle}>Income</Text>
        <Divider />
        {incomeData.map((item, index) => (
          <View style={styles.row} key={index}>
            <Text style={styles.category}>{item.account}</Text>
            <Text style={styles.amount}>₹ {item.amount.toFixed(2)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>₹ {totalIncome.toFixed(2)}</Text>
        </View>

        {/* Expense Section */}
        <Text style={styles.sectionTitle}>Expense</Text>
        <Divider />
        {expenseData.map((item, index) => (
          <View style={styles.row} key={index}>
            <Text style={styles.category}>{item.account}</Text>
            <Text style={styles.amount}>₹ {item.amount.toFixed(2)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>₹ {totalExpenses.toFixed(2)}</Text>
        </View>
      </ScrollView>
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
  scrollcontainer: {
    padding: 10,
    backgroundColor: "#fff",
  },
  scrollheader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dateSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dateInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  goButton: {
    marginLeft: 10,
  },
  cardSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  card: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: "#E8F5E9",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  category: {
    flex: 1,
    textAlign: "left",
  },
  amount: {
    flex: 1,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  totalLabel: {
    fontWeight: "bold",
  },
  totalAmount: {
    fontWeight: "bold",
  },
});

export default IncomeAndExpenditureScreen;
