import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
  TouchableWithoutFeedback,
} from "react-native";
import { Card, Text, FAB, Divider, Button } from "react-native-paper";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useRouter } from "expo-router";

import Dropdown from "../../../utils/DropDown";
import PaymentDatePicker from "../../../utils/paymentDate";
import { transactionFromToGroupList } from "../../../components/LedgerGroupList"; // Import the array
import { fetchAccountList } from "../../../utils/acountFetcher";
// Import the date formatter utility
import { formatDateIntl, formatDate } from "@/utils/dateFormatter";
import { fetchLatestBalanceBeforeDate } from "@/utils/fetchbalancefromdatabase";
import { useSociety } from "@/utils/SocietyContext";
import AppbarComponent from "@/components/AppbarComponent";
import AppbarMenuComponent from "@/components/AppbarMenuComponent";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Transaction {
  id: string;
  type: string; // "Income" or "Expense"
  voucher: string;
  paidTo: string;
  narration: string;
  paidFrom: string; // "Bank" or "Cash"
  amount: number;
  transactionDate: string;
  groupFrom: string;
  groupTo: string;
}

const TransactionScreen = () => {
  const insets = useSafeAreaInsets();
  const { societyName } = useSociety();
  const transactionCollectionName = `Transactions_${societyName}`;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [originaltransactions, setOriginalTransactions] = useState<any[]>([]);

  const [openingBankBalance, setOpeningBankBalance] = useState<number>(0);
  const [closingBankBalance, setClosingBankBalance] = useState<number>(0);

  const [openingCashBalance, setOpeningCashBalance] = useState<number>(0);
  const [closingCashBalance, setClosingCashBalance] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Modal and Filter States
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [toDate, setToDate] = useState(new Date(Date.now()));
  const [ledgerOptions, setLedgerOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [ledger, setLedger] = useState<any>("All");

  // Get the current date and set it to the 1st of the current month
  const getFirstDayOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  };
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());

  const [formattedDate, setFormattedDate] = useState(formatDate(fromDate));
  const [formattedToDate, setFormattedToDate] = useState(formatDate(toDate));

  useEffect(() => {
    const fetchbalances = async () => {
      const balancebank = await fetchLatestBalanceBeforeDate(
        societyName,
        "Bank Accounts",
        "Bank",
        formattedDate
      );
      setOpeningBankBalance(balancebank);
      const balanceCash = await fetchLatestBalanceBeforeDate(
        societyName,
        "Cash in Hand",
        "Cash",
        formattedDate
      );
      setOpeningCashBalance(balanceCash);

      const balancebankfordate = await fetchLatestBalanceBeforeDate(
        societyName,
        "Bank Accounts",
        "Bank",
        formattedToDate
      );
      setClosingBankBalance(balancebankfordate);

      const balanceclosefordate = await fetchLatestBalanceBeforeDate(
        societyName,
        "Cash in Hand",
        "Cash",
        formattedToDate
      );
      setClosingCashBalance(balanceclosefordate);
    };
    fetchbalances();
  }, []);

  // Fetch transactions from Firebase
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const querySnapshot = await getDocs(
          collection(db, "Societies", societyName, transactionCollectionName)
        );
        const fetchedTransactions: Transaction[] = querySnapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          })
        ) as Transaction[];
        setTransactions(fetchedTransactions);
        setOriginalTransactions(fetchedTransactions);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const { accountOptions } = await fetchAccountList(
          societyName,
          transactionFromToGroupList
        );
        // push 'All' at the start of array using unshift
        accountOptions.unshift({ label: "All", value: "All", group: "All" });
        // Update the state with the sorted options
        setLedgerOptions(accountOptions);
      } catch (error) {
        Alert.alert("Error", "Failed to fetch account options.");
      }
    };

    fetchOptions();
  }, []);

  // Calculate Totals
  const totalIncome = transactions
    .filter((transaction) => transaction.type === "Income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const totalExpenses = transactions
    .filter((transaction) => transaction.type === "Expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const resetFilters = () => {
    setIsModalVisible(true);
    setTransactions(originaltransactions); // Set to the original data
  };

  const applyFilters = () => {
    setIsModalVisible(false);

    const filteredData = transactions.filter((item) => {
      // Filter by date range
      const itemDate = new Date(item.transactionDate); // Assuming `item.date` is a string in a valid date format
      const isWithinDateRange = itemDate >= fromDate && itemDate <= toDate;

      // Filter by ledger
      const matchesLedger =
        ledger === "All" || item.paidFrom === ledger || item.paidTo === ledger;

      // Include item if it matches all filters
      return isWithinDateRange && matchesLedger;
    });

    setTransactions(filteredData);
  };

  useEffect(() => {
    if (originaltransactions.length > 0) {
      applyFilters(); // Apply filters after data fetch
    }
  }, [originaltransactions]);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={closeMenu}>
      <View style={styles.container}>
        {/* Top Appbar */}
        <AppbarComponent
          title="Transactions"
          source="Admin"
          onPressFilter={() => resetFilters()}
          onPressThreeDot={() => setMenuVisible(!menuVisible)}
        />

        {/* Three-dot Menu */}
        {/* Custom Menu */}
        {menuVisible && (
          <AppbarMenuComponent
            items={[
              "Edit Ledger",
              "Delete Ledger",
              "Download PDF",
              "Download Excel",
              "Vouchers PDF",
            ]}
            onItemPress={handleMenuOptionPress}
            closeMenu={closeMenu}
          />
        )}

        {/* Content */}
        <ScrollView style={styles.content}>
          {/* Date and Ledger Summary */}
          <TouchableOpacity onPress={() => resetFilters()}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryText}>
                From: {formatDateIntl(fromDate)} To: {formatDateIntl(toDate)}
              </Text>
              <Text style={styles.summaryText}>Ledger Account: {ledger}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.summary}>
            {/* Account Summary Cards */}
            {/* Bank Block */}
            <View style={[styles.block, styles.bankBlock]}>
              <Text style={styles.blockTitle}>Bank</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Opening Bal:</Text>
                <Text style={styles.value}>
                  ₹ {openingBankBalance.toFixed(2)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Closing Bal:</Text>
                <Text style={styles.value}>
                  ₹ {closingBankBalance.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Cash Block */}
            <View style={[styles.block, styles.cashBlock]}>
              <Text style={styles.blockTitle}>Cash</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Opening Bal:</Text>
                <Text style={styles.value}>
                  ₹ {openingCashBalance.toFixed(2)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Closing Bal:</Text>
                <Text style={styles.value}>
                  ₹ {closingCashBalance.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Income and Expense Summary */}
          <View style={styles.summary}>
            <Card style={[styles.card, styles.incomeCard]}>
              <Card.Content>
                <Text>Total Income</Text>
                <Text style={styles.incomeText}>
                  ₹ {totalIncome.toFixed(2)}
                </Text>
              </Card.Content>
            </Card>
            <Card style={[styles.card, styles.expenseCard]}>
              <Card.Content>
                <Text>Total Expenses</Text>
                <Text style={styles.expenseText}>
                  ₹ {totalExpenses.toFixed(2)}
                </Text>
              </Card.Content>
            </Card>
          </View>

          {/* Transaction List */}
          {transactions.map((transaction) => (
            <View key={transaction.id}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/admin/Accounting/TransactionDetailScreen",
                    params: {
                      id: transaction.id,
                      type: transaction.type,
                      voucher: transaction.voucher,
                      transactionDate: transaction.transactionDate,
                      paidFrom: transaction.paidFrom,
                      paidTo: transaction.paidTo,
                      amount: transaction.amount,
                      narration: transaction.narration,
                      groupFrom: transaction.groupFrom,
                      groupTo: transaction.groupTo,
                    },
                  })
                }
              >
                <View style={styles.transaction}>
                  <View>
                    <Text variant="titleMedium">
                      {transaction.type} - {transaction.voucher}
                    </Text>
                  </View>
                  <View style={styles.transactioncontent}>
                    <View style={styles.transactionLeft}>
                      <Text>{transaction.paidTo}</Text>
                      <Text>{transaction.narration}</Text>
                      <Text>Via: {transaction.paidFrom}</Text>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text
                        variant="titleLarge"
                        style={{
                          color:
                            transaction.type === "Income" ? "green" : "red",
                        }}
                      >
                        ₹ {transaction.amount.toFixed(2)}
                      </Text>
                      <Text>{transaction.transactionDate}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
              <Divider />
            </View>
          ))}
        </ScrollView>

        {/* Modal */}
        <Modal
          visible={isModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.section}>
                <Text style={styles.label}>From Date</Text>
                <PaymentDatePicker
                  initialDate={fromDate}
                  onDateChange={setFromDate}
                />
              </View>
              <View style={styles.section}>
                <Text style={styles.label}>To Date</Text>
                <PaymentDatePicker
                  initialDate={toDate}
                  onDateChange={setToDate}
                />
              </View>

              {/* Ledger Account */}
              <View style={styles.section}>
                <Text style={styles.label}>Select Ledger </Text>
                <Dropdown
                  data={ledgerOptions}
                  onChange={setLedger}
                  placeholder="Select Account"
                  initialValue={ledger}
                />
              </View>

              {/* Apply Button */}
              <Button
                mode="contained"
                onPress={applyFilters}
                style={styles.applyButton}
              >
                Go
              </Button>
            </View>
          </View>
        </Modal>

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
          onPress={() =>
            router.push({
              pathname: "/admin/Accounting/Vouchers",
            })
          }
        />
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { backgroundColor: "#6200ee" },
  titleStyle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  summaryHeader: { padding: 16 },
  summaryText: { fontSize: 14, color: "#666" },
  content: { padding: 2 },
  section: { marginVertical: 10 },
  //summary: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  // card: { flex: 1, marginHorizontal: 5, padding: 10 },
  card: {
    flex: 1,
    marginHorizontal: 5,
    padding: 2,
    borderRadius: 2, // Rounded corners for the cards
    elevation: 2, // Shadow for Android
    shadowColor: "#000", // Shadow for iOS
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
  },
  // Individual block colors
  bankCard: {
    backgroundColor: "#E0F7FA",
  },
  cashCard: {
    backgroundColor: "#FFEBEE",
  },
  incomeCard: {
    backgroundColor: "#E8F5E9",
  },
  expenseCard: {
    backgroundColor: "#FFEBEE",
  },
  // Text for Total Income and Expense
  incomeText: {
    fontSize: 18,
    color: "green",
    fontWeight: "bold",
  },
  expenseText: {
    fontSize: 18,
    color: "red",
    fontWeight: "bold",
  },
  transaction: { paddingVertical: 10 },
  fab: { position: "absolute", right: 16, bottom: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  transactioncontent: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  transactionLeft: {
    flex: 3,
    justifyContent: "flex-start",
  },
  transactionRight: {
    flex: 2,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 10,
  },
  //section: { marginBottom: 16 },
  //label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  applyButton: { marginTop: 20 },
  datesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    padding: 10,
  },
  // Text alignment and styling
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  cardText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginTop: 4,
  },

  accountSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  accountBlock: {
    flex: 1,
    marginHorizontal: 5,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  accountTitle: { fontWeight: "bold", marginBottom: 5 },

  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
    paddingHorizontal: 8,
  },
  block: {
    flex: 1,
    padding: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    elevation: 2, // Shadow for Android
    backgroundColor: "#fff", // Background color
    shadowColor: "#000", // Shadow for iOS
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
  },
  bankBlock: {
    backgroundColor: "#E0F7FA", // Light blue
  },
  cashBlock: {
    backgroundColor: "#FFEBEE", // Light red
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  row: {
    flexDirection: "row", // Horizontal layout
    justifyContent: "space-between", // Space between label and value
    alignItems: "center", // Align vertically
    marginBottom: 6, // Space between rows
  },
  label: {
    fontSize: 12,
    color: "#555",
  },
  value: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000",
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

export default TransactionScreen;
