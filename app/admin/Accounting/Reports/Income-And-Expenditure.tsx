import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { Text, Divider } from "react-native-paper";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";

import AppbarComponent from "@/components/AppbarComponent";
import AppbarMenuComponent from "@/components/AppbarMenuComponent";
import FinancialYearButtons from "@/components/FinancialYearButtons";
import DateRangePicker from "@/components/DateRangePicker";
import { getCurrentFinancialYear } from "@/utils/financialYearHelpers";
import AccountSummaryCards from "@/components/AccountSummaryCards";

import { useSociety } from "@/utils/SocietyContext";
import {
  fetchBalanceForDate,
  fetchLatestBalanceBeforeDate,
} from "@/utils/fetchbalancefromdatabase";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import LoadingIndicator from "@/components/LoadingIndicator";
import { formatDate } from "@/utils/dateFormatter";
import { fetchBankCahBalances } from "@/utils/fetchBankCahBalances";

interface AccountWithBalance {
  account: string;
  balance: number;
}

const IncomeAndExpenditureScreen: React.FC = () => {
  const { startDate, endDate } = getCurrentFinancialYear(); // returns start and end of current FY
  const insets = useSafeAreaInsets();

  const { societyName } = useSociety();
  const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`;
  const accountsCollectionName = `accounts_${societyName}`;

  const [incomeData, setIncomeData] = useState<
    { account: string; balance: number }[]
  >([]);
  const [expenseData, setExpenseData] = useState<
    { account: string; balance: number }[]
  >([]);

  const [IncomeOptions, setIncomeOptions] = useState<AccountWithBalance[]>([]);
  const [ExpenseOptions, setExpenseOptions] = useState<AccountWithBalance[]>(
    []
  );

  const [loading, setLoading] = useState(false);
  const [accountBalances, setAccountBalances] = useState<any[]>([]);

  const IncomeCategories = ["Direct Income", "Indirect Income"];

  const ExpenditureCategories = [
    "Direct Expenses",
    "Indirect Expenses",
    "Maintenance & Repairing",
  ];

  const [fromDate, setFromDate] = useState(new Date(startDate));
  const [toDate, setToDate] = useState(new Date(endDate));

  const handleYearSelect = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    setFromDate(startDate);
    setToDate(endDate);
  };

  useEffect(() => {
    const fromDateStr = formatDate(fromDate);
    const toDateStr = formatDate(toDate);

    const fetchIncomeExpenditureOptionsWithBalance = async () => {
      setLoading(true);
      try {
        const ledgerGroupsRef = collection(
          db,
          "Societies",
          societyName,
          ledgerGroupsCollectionName
        );

        const ledgerGroupsSnapshot = await getDocs(ledgerGroupsRef);

        const incomeAccounts: AccountWithBalance[] = [];
        const expenseAccounts: AccountWithBalance[] = [];

        const ledgerGroupsPromises = ledgerGroupsSnapshot.docs.map(
          async (ledgerGroupDoc) => {
            const ledgerGroupName = ledgerGroupDoc.id;

            const accountsRef = collection(
              db,
              `Societies/${societyName}/${ledgerGroupsCollectionName}/${ledgerGroupName}/${accountsCollectionName}`
            );

            const accountsSnapshot = await getDocs(accountsRef);

            const accountsPromises = accountsSnapshot.docs.map(
              async (accountDoc) => {
                const accountName = accountDoc.id.trim();
                if (!accountName) return null;

                const latestBalance = await fetchBalanceForDate(
                  societyName,
                  ledgerGroupName,
                  accountName,
                  toDateStr
                );

                return { account: accountName, balance: latestBalance || 0 };
              }
            );

            const accountsWithBalances = (
              await Promise.all(accountsPromises)
            ).filter((a): a is AccountWithBalance => a !== null);

            if (IncomeCategories.includes(ledgerGroupName)) {
              incomeAccounts.push(...accountsWithBalances);
            } else if (ExpenditureCategories.includes(ledgerGroupName)) {
              expenseAccounts.push(...accountsWithBalances);
            }
          }
        );

        await Promise.all(ledgerGroupsPromises);

        // Set state
        setIncomeOptions(incomeAccounts);
        setExpenseOptions(expenseAccounts);

        // 3️⃣ Fetch Account Summary Balances (parallel)

        const balances = await await fetchBankCahBalances(
          societyName,
          fromDateStr,
          toDateStr
        );
        setAccountBalances(balances);
      } catch (error) {
        console.error("Error fetching income/expenditure options:", error);
        Alert.alert("Error", "Failed to fetch account options.");
      } finally {
        setLoading(false);
      }
    };

    fetchIncomeExpenditureOptionsWithBalance();
  }, [toDate]); // refetch if toDate changes

  useEffect(() => {
    if (IncomeOptions.length > 0) {
      const filteredIncome = IncomeOptions.filter((item) => item.balance !== 0);
      setIncomeData(filteredIncome);
    }
  }, [IncomeOptions]);

  const totalIncome = incomeData.reduce((sum, item) => sum + item.balance, 0);
  const totalExpenses = expenseData.reduce(
    (sum, item) => sum + item.balance,
    0
  );

  useEffect(() => {
    if (ExpenseOptions.length > 0) {
      const filteredExpense = ExpenseOptions.filter(
        (item) => item.balance !== 0
      );
      setExpenseData(filteredExpense);
    }
  }, [ExpenseOptions]);

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
    return <LoadingIndicator />;
  }

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

      {/* ✅ Reusable Financial Year Buttons */}
      <FinancialYearButtons onYearSelect={handleYearSelect} />

      {/* ✅ Reusable Date Range Picker */}

      <DateRangePicker
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={setFromDate}
        setToDate={setToDate}
        onGoPress={closeMenu}
        minimumDate={new Date(startDate)}
        maximumDate={new Date(endDate)}
      />
      <Divider />

      {/*  ✅ Reusable Bank and Cash Details */}
      <View style={styles.section}>
        <AccountSummaryCards balances={accountBalances} />
      </View>
      <Divider />

      <ScrollView
        style={styles.scrollcontainer}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100, // 👈 add enough gap for footer + FAB
        }}
      >
        {/* Income Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Income</Text>
        </View>

        {incomeData.map((item, index) => (
          <View style={styles.row} key={index}>
            <Text style={styles.category}>{item.account}</Text>
            <Text style={styles.amount}>₹ {item.balance.toFixed(2)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>₹ {totalIncome.toFixed(2)}</Text>
        </View>

        {/* Expense Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Expense</Text>
        </View>

        {expenseData.map((item, index) => (
          <View style={styles.row} key={index}>
            <Text style={styles.category}>{item.account}</Text>
            <Text style={styles.amount}>₹ {item.balance.toFixed(2)}</Text>
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
  },
  sectionHeader: {
    backgroundColor: "#eaeaea",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    marginHorizontal: 16,
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
    marginHorizontal: 16,
  },
  totalLabel: {
    fontWeight: "bold",
  },
  totalAmount: {
    fontWeight: "bold",
  },
  section: {
    marginBottom: 6, // small controlled gap between sections
  },
});

export default IncomeAndExpenditureScreen;
