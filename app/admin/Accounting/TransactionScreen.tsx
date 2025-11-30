import { db } from "@/firebaseConfig";
import { useRouter } from "expo-router";
import {
  collection,
  collectionGroup,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Button, Card, Divider, FAB, Text } from "react-native-paper";

import { transactionFromToGroupList } from "../../../components/LedgerGroupList"; // Import the array
import { fetchAccountList } from "../../../utils/acountFetcher";
import Dropdown from "../../../utils/DropDown";
import PaymentDatePicker from "../../../utils/paymentDate";
// Import the date formatter utility
import AppbarComponent from "@/components/AppbarComponent";
import AppbarMenuComponent from "@/components/AppbarMenuComponent";
import { formatDate, formatDateIntl } from "@/utils/dateFormatter";
import {
  fetchBalanceForDate,
  fetchLatestBalanceBeforeDate,
} from "@/utils/fetchbalancefromdatabase";
import { useSociety } from "@/utils/SocietyContext";
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";
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
  useCustomBackHandler("/admin/Accounting");
  const { societyName } = useSociety();
  // const transactionCollectionNam = `Transactions_${societyName}`;

  // const unclearedBalanceSubcollectionName = `unclearedBalances_${societyName}`;

  const unclearedBalanceSubcollectionName = "unclearedBalances";

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [originaltransactions, setOriginalTransactions] = useState<any[]>([]);

  const [openingBankBalance, setOpeningBankBalance] = useState<number>(0);
  const [closingBankBalance, setClosingBankBalance] = useState<number>(0);

  const [openingCashBalance, setOpeningCashBalance] = useState<number>(0);
  const [closingCashBalance, setClosingCashBalance] = useState<number>(0);

  const [memberReceiptTotal, setMemberReceiptTotal] = useState<number>(0);

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

      const balancebankfordate = await fetchBalanceForDate(
        societyName,
        "Bank Accounts",
        "Bank",
        formattedToDate
      );
      setClosingBankBalance(balancebankfordate);

      const balanceclosefordate = await fetchBalanceForDate(
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
        const transactionsRef = collection(db, "Transactions");
        const q = query(
          transactionsRef,
          where("societyName", "==", societyName)
        );
        const querySnapshot = await getDocs(q);
        const fetchedTransactions: Transaction[] = querySnapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          })
        ) as Transaction[];

        // 🔽 Sort by transactionDate (descending), then by voucher (ascending)
        const sortedTransactions = fetchedTransactions.sort((a, b) => {
          const dateA = new Date(a.transactionDate).getTime();
          const dateB = new Date(b.transactionDate).getTime();

          if (dateB !== dateA) {
            return dateB - dateA; // Sort by date (latest first)
          }

          // ✅ If same date, sort by voucher (descending)
          return b.voucher.localeCompare(a.voucher, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        });
        setTransactions(sortedTransactions);
        setOriginalTransactions(sortedTransactions);
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
        console.log("error", error);
        Alert.alert("Error", "Failed to fetch account options.");
      }
    };

    fetchOptions();
  }, []);

  // Calculate Totals

  const IncomeCategories = ["Direct Income", "Indirect Income"];

  const ExpenditureCategories = [
    "Direct Expenses",
    "Indirect Expenses",
    "Maintenance & Repairing",
  ];

  const totalIncome =
    transactions.reduce((sum, transaction) => {
      if (transaction.type === "Income") return sum + transaction.amount;
      // Include Purchases paid TO income groups
      if (
        transaction.type === "Purchase" &&
        IncomeCategories.includes(transaction.groupTo)
      )
        return sum + transaction.amount;
      return sum;
    }, 0) + memberReceiptTotal;

  const totalExpenses = transactions.reduce((sum, transaction) => {
    if (transaction.type === "Expense") return sum + transaction.amount;
    // Include Purchases paid TO expense groups
    if (
      transaction.type === "Purchase" &&
      ExpenditureCategories.includes(transaction.groupTo)
    )
      return sum + transaction.amount;
    return sum;
  }, 0);

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

  useEffect(() => {
    const fetchMemberReceiptTotal = async () => {
      try {
        let memberReceiptAmount = 0;
        const unclearedBalanceQuery = query(
          collectionGroup(db, unclearedBalanceSubcollectionName),
          where("societyName", "==", societyName),
          where("status", "==", "Cleared") // ✅ Only fetch docs with status = "Cleared"
        );
        const unclearedBalanceQuerySnapshot = await getDocs(
          unclearedBalanceQuery
        );
        unclearedBalanceQuerySnapshot.forEach((doc) => {
          const unclearedBalanceData = doc.data();
          memberReceiptAmount += unclearedBalanceData.amountReceived;
        });
        setMemberReceiptTotal(memberReceiptAmount);
      } catch (error) {
        console.log(error);
      }
    };
    fetchMemberReceiptTotal();
  }, []);

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

        {/* Date and Ledger Summary */}
        <TouchableOpacity onPress={() => resetFilters()}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryText}>
              From: {formatDateIntl(fromDate)} To: {formatDateIntl(toDate)}
            </Text>
            <Text style={styles.summaryText}>Ledger Account: {ledger}</Text>
          </View>
        </TouchableOpacity>
        <Divider />

        <View style={styles.summary}>
          {/* Account Summary Cards */}
          {/* Bank Block */}
          <View style={[styles.block, styles.bankBlock]}>
            <Text style={styles.blockTitle}>Bank</Text>

            <Text style={styles.label}>
              Opening Bal:
              <Text style={styles.value}>
                ₹ {openingBankBalance.toFixed(2)}
              </Text>
            </Text>

            <Text style={styles.label}>
              Closing Bal:
              <Text style={styles.value}>
                ₹ {closingBankBalance.toFixed(2)}
              </Text>
            </Text>
          </View>

          {/* Cash Block */}
          <View style={[styles.block, styles.cashBlock]}>
            <Text style={styles.blockTitle}>Cash</Text>

            <Text style={styles.label}>
              Opening Bal:{" "}
              <Text style={styles.value}>
                ₹ {openingCashBalance.toFixed(2)}{" "}
              </Text>
            </Text>

            <Text style={styles.label}>
              Closing Bal:
              <Text style={styles.value}>
                ₹ {closingCashBalance.toFixed(2)}
              </Text>
            </Text>
          </View>
        </View>
        <Divider />

        {/* Income and Expense Summary */}
        <View style={styles.summary}>
          <Card style={[styles.card, styles.incomeCard]}>
            <View
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                alignItems: "center",
              }}
            >
              <Text>Total Income</Text>
              <Text style={styles.incomeText}>₹ {totalIncome.toFixed(2)}</Text>
            </View>
          </Card>
          <Card style={[styles.card, styles.expenseCard]}>
            <View
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                alignItems: "center",
              }}
            >
              <Text>Total Expenses</Text>
              <Text style={styles.expenseText}>
                ₹ {totalExpenses.toFixed(2)}
              </Text>
            </View>
          </Card>
        </View>
        <Divider />
        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100, // 👈 add enough gap for footer + FAB
          }}
        >
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
                        variant="titleMedium"
                        style={{
                          color:
                            transaction.type === "Income"
                              ? "green"
                              : transaction.type === "Expense"
                                ? "red"
                                : transaction.type === "Journal"
                                  ? "black"
                                  : "blue", // default fallback
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
          {/* 👇 Footer View */}
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/admin/Accounting/Reports/ReceiptSummary",
                params: {},
              })
            }
          >
            <View style={styles.transaction}>
              <View>
                <Text variant="titleMedium">Member Receipt</Text>
              </View>
              <View style={styles.transactioncontent}>
                <View style={styles.transactionLeft}>
                  <Text>Total amount received from building members</Text>
                </View>
                <View style={styles.transactionRight}>
                  <Text variant="titleMedium" style={{ color: "green" }}>
                    ₹ {memberReceiptTotal.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
          <Divider />
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
        <View style={[styles.footer, { bottom: insets.bottom }]}>
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

  summaryHeader: { padding: 16 },
  summaryText: { fontSize: 14, color: "#666" },
  content: { padding: 2 },
  section: { marginVertical: 10 },
  //summary: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  // card: { flex: 1, marginHorizontal: 5, padding: 10 },
  card: {
    marginHorizontal: 5,
    padding: 2,
    borderRadius: 2, // Rounded corners for the cards
    elevation: 2, // Shadow for Android
    shadowColor: "#000", // Shadow for iOS
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
  },

  incomeCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#4CAF50", // Material green
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },

  expenseCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E91E63", // Material red/pink
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },

  incomeText: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "bold",
    marginTop: 4,
  },

  expenseText: {
    fontSize: 16,
    color: "#E91E63",
    fontWeight: "bold",
    marginTop: 4,
  },
  transaction: { paddingVertical: 10, marginHorizontal: 16 },
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

  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
    paddingHorizontal: 8,
  },
  block: {
    flex: 1,
    padding: 4,
    marginHorizontal: 5,
    borderRadius: 8,
    elevation: 3, // subtle shadow
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  bankBlock: {
    // backgroundColor: "#E0F7FA", // Light blue
    backgroundColor: "#B2EBF2", // pastel blue
  },
  cashBlock: {
    // backgroundColor: "#FFEBEE", // Light red
    backgroundColor: "#B2DFDB", // pastel teal
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 6,
  },

  label: {
    fontSize: 13,
    color: "#444",
    marginBottom: 4,
  },

  value: {
    fontSize: 16,

    color: "#000",
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

export default TransactionScreen;
