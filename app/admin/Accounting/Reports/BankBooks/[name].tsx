import AccountSummaryCards from "@/components/AccountSummaryCards";
import DateLedgerSummary from "@/components/DateLedgerSummary";
import IncomeExpenseSummary from "@/components/IncomeExpenseSummary";
import LoadingIndicator from "@/components/LoadingIndicator";
import { db } from "@/firebaseConfig";
import { formatDate } from "@/utils/dateFormatter";
import { fetchBankCahBalances } from "@/utils/fetchBankCahBalances";
import { useSociety } from "@/utils/SocietyContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  collectionGroup,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Appbar, Card, Divider } from "react-native-paper";

const BankAccount = () => {
  const router = useRouter();
  const { name } = useLocalSearchParams(); // ✅ dynamic param like "Cash 2"
  const ledgerAccount = name as string;
  // console.log("ledgerAccount", ledgerAccount);
  const { societyName } = useSociety();
  // const transactionCollectionNam = `Transactions_${societyName}`;

  // const unclearedBalanceSubcollectionName = `unclearedBalances_${societyName}`;

  const unclearedBalanceSubcollectionName = "unclearedBalances";

  const [transactions, setTransactions] = useState<any[]>([]);
  const [unclearedBalance, setUnclearedBalance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Default dates
  const getFirstDayOfMonth = () =>
    new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(new Date());
  const [accountBalances, setAccountBalances] = useState<any[]>([]);

  useEffect(() => {
    if (!ledgerAccount) return;

    const fromDateStr = formatDate(fromDate);
    const toDateStr = formatDate(toDate);

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const transactionsRef = collection(db, "Transactions");

        const fromQuery = query(
          transactionsRef,
          where("societyName", "==", societyName),
          where("paidFrom", "==", ledgerAccount),
          where("transactionDate", ">=", fromDateStr),
          where("transactionDate", "<=", toDateStr)
        );
        const toQuery = query(
          transactionsRef,
          where("societyName", "==", societyName),
          where("paidTo", "==", ledgerAccount),
          where("transactionDate", ">=", fromDateStr),
          where("transactionDate", "<=", toDateStr)
        );

        const [fromSnap, toSnap] = await Promise.all([
          getDocs(fromQuery),
          getDocs(toQuery),
        ]);
        const allResults = [...fromSnap.docs, ...toSnap.docs].map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setTransactions(allResults);

        // 3️⃣ Fetch Account Summary Balances (parallel)

        const balances = await await fetchBankCahBalances(
          societyName,
          fromDateStr,
          toDateStr,
          ledgerAccount
        );
        setAccountBalances(balances);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [ledgerAccount, fromDate, toDate, societyName]);

  useEffect(() => {
    const fetchUnclearedBalance = async () => {
      try {
        const fromDateStr = formatDate(fromDate);
        const toDateStr = formatDate(toDate);

        const unclearedBalanceQuery = query(
          collectionGroup(db, unclearedBalanceSubcollectionName),
          where("societyName", "==", societyName),
          where("status", "==", "Cleared"),
          where("ledgerAccount", "==", ledgerAccount),
          where("paymentReceivedDate", ">=", fromDateStr),
          where("paymentReceivedDate", "<=", toDateStr)
        );

        const snap = await getDocs(unclearedBalanceQuery);
        const list: any[] = [];
        snap.forEach((doc) => list.push(doc.data()));
        setUnclearedBalance(list);
      } catch (error) {
        console.error("Error fetching uncleared balance:", error);
      }
    };
    fetchUnclearedBalance();
  }, [ledgerAccount, fromDate, toDate, unclearedBalanceSubcollectionName]);

  // Combine uncleared balance and transactions for FlatList
  const combinedData = [
    ...unclearedBalance.map((item) => ({
      ...item,
      itemType: "uncleared",
      date: item.paymentDate,
    })),
    ...transactions.map((item) => ({
      ...item,
      itemType: "transaction",
      date: item.transactionDate,
    })),
  ];

  // Sort by date descending (latest first)
  combinedData.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA; // descending
  });

  if (loading) return <LoadingIndicator />;

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content
          title={`${ledgerAccount} Book`}
          titleStyle={styles.titleStyle}
        />
        <Appbar.Action
          icon="filter"
          onPress={() => setIsModalVisible(true)}
          color="#fff"
        />
      </Appbar.Header>

      <DateLedgerSummary
        fromDate={fromDate}
        toDate={toDate}
        ledger={ledgerAccount}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onLedgerChange={() => {}}
        societyName={societyName}
        showModal={() => setIsModalVisible(true)}
        isModalVisible={isModalVisible}
        hideModal={() => setIsModalVisible(false)}
        ledgerOptionsOverride={[
          { label: ledgerAccount as string, value: ledgerAccount as string },
        ]}
      />
      <Divider />

      <View style={styles.section}>
        {/* <AccountSummaryCards fromDate={fromDate} toDate={toDate} /> */}
        {/* <AccountSummaryCards fromDate={fromDate} toDate={toDate} /> */}
        <AccountSummaryCards balances={accountBalances} />
      </View>
      <Divider />
      <View style={styles.section}>
        <IncomeExpenseSummary totalIncome={500000} totalExpenses={100000} />
      </View>
      <Divider />

      <FlatList
        data={combinedData}
        keyExtractor={(item, index) =>
          item.itemType === "uncleared"
            ? `uncleared-${item.transactionId}-${index}`
            : `transaction-${item.id}-${index}`
        }
        renderItem={({ item }) => (
          <Card
            style={styles.receiptCard}
            onPress={() => {
              if (item.itemType === "uncleared") {
                router.push({
                  pathname: "/admin/Accounting/Reports/VoucherDetails",
                  params: {
                    wing: item.wing,
                    floor: item.floor,
                    flatNumber: item.flatNumber,
                    type: item.type,
                    amount: item.amount,
                    paymentDate: item.paymentDate,
                    voucherNumber: item.voucherNumber,
                    paymentMode: item.paymentMode,
                    selectedIds: JSON.stringify(item.selectedIds),
                    transactionId: item.transactionId,
                    selectedBills: JSON.stringify(item.selectedBills),
                    ledgerAccount: item.ledgerAccount,
                    ledgerAccountGroup: item.ledgerAccountGroup,
                  },
                });
              } else {
                router.push({
                  pathname: "/admin/Accounting/TransactionDetailScreen",
                  params: {
                    id: item.id,
                    type: item.type,
                    voucher: item.voucher,
                    transactionDate: item.transactionDate,
                    paidFrom: item.paidFrom,
                    paidTo: item.paidTo,
                    amount: item.amount,
                    narration: item.narration,
                    groupFrom: item.groupFrom,
                    groupTo: item.groupTo,
                  },
                });
              }
            }}
          >
            <Card.Content>
              {/* Voucher/ID */}
              <Text style={styles.receiptId}>
                {item.itemType === "uncleared"
                  ? item.voucherNumber
                  : `${item.type} - ${item.voucher}`}
              </Text>
              <View style={styles.transactioncontent}>
                <View style={styles.transactionLeft}>
                  {/* From / To */}
                  {item.itemType === "uncleared" ? (
                    <Text>
                      Received From: {item.wing} {item.flatNumber}
                    </Text>
                  ) : (
                    <>
                      <Text>Paid To: {item.paidTo}</Text>
                      <Text>Via: {item.paidFrom}</Text>
                    </>
                  )}

                  {/* Additional info */}
                  {item.itemType === "uncleared" ? (
                    <>
                      <Text>Payment Mode: {item.paymentMode}</Text>
                      {item.bankName && <Text>Bank Name: {item.bankName}</Text>}
                      {item.chequeNo && <Text>Cheque No: {item.chequeNo}</Text>}
                    </>
                  ) : (
                    <>
                      <Text>Narration:{item.narration}</Text>
                    </>
                  )}
                </View>
                <View style={styles.transactionRight}>
                  {/* Footer: Amount & Date */}
                  <Text
                    style={[
                      styles.receiptAmount,
                      {
                        color:
                          item.type === "Income"
                            ? "green"
                            : item.type === "Expense"
                              ? "red"
                              : item.type === "Journal"
                                ? "black"
                                : "blue", // default fallback
                      },
                    ]}
                  >
                    ₹{" "}
                    {item.itemType === "uncleared"
                      ? parseFloat(item.amount).toFixed(2)
                      : item.amount.toFixed(2)}
                  </Text>
                  <Text style={styles.receiptDate}>
                    {item.itemType === "uncleared"
                      ? item.paymentDate
                      : item.transactionDate}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
        ItemSeparatorComponent={() => <Divider />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

export default BankAccount;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { backgroundColor: "#6200ee" },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  receiptCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: "#fff",
    elevation: 2,
  },
  listContent: { paddingBottom: 16 },
  section: {
    marginBottom: 6, // small controlled gap between sections
  },
  receiptId: { fontWeight: "bold", marginBottom: 4 },
  receiptAmount: { fontSize: 16, fontWeight: "bold", color: "#4CAF50" },
  receiptDate: { fontSize: 12, color: "#666" },
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
});
