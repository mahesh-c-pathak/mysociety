import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  TouchableWithoutFeedback,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter, Stack } from "expo-router";

import { db } from "@/firebaseConfig";
import { Card, Text, Divider, Button } from "react-native-paper";
import { useSociety } from "@/utils/SocietyContext";
import Dropdown from "@/utils/DropDown";
import PaymentDatePicker from "@/utils/paymentDate";
import { fetchbankCashAccountOptions } from "@/utils/bankCashOptionsFetcher";
import paymentModeOptions from "@/constants/paymentModeOptions";

import DropdownMultiSelect from "@/utils/DropdownMultiSelect";
import { fetchMembersUpdated, Member } from "@/utils/fetchMembersUpdated";
import { getDocs, collectionGroup, query, where } from "firebase/firestore";

import AppbarComponent from "@/components/AppbarComponent";
import AppbarMenuComponent from "@/components/AppbarMenuComponent";
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";

const ReceiptSummary = () => {
  const router = useRouter();
  useCustomBackHandler("/admin/Accounting/Reports");
  const { societyName } = useSociety();
  const [unclearedBalance, setUnclearedBalance] = useState<any[]>([]);
  const [originalBalance, setOriginalBalance] = useState<any[]>([]);

  // Modal and Filter States
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [toDate, setToDate] = useState(new Date(Date.now()));
  const [ledgerOptions, setLedgerOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [ledger, setLedger] = useState<any>("All");
  const [paymentMethod, setPaymentMethod] = useState<string>("All");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const [members, setMembers] = useState<Member[]>([]);

  const [loading, setLoading] = useState(false);

  // const unclearedBalanceSubcollectionName = `unclearedBalances_${societyName}`;

  const unclearedBalanceSubcollectionName = "unclearedBalances";

  useEffect(() => {
    const getMembers = async () => {
      setLoading(true);
      try {
        const membersData = await fetchMembersUpdated(societyName);
        setMembers(membersData);
      } catch (error) {
        console.log("error", error);
        Alert.alert("Error", "Failed to fetch members.");
      } finally {
        setLoading(false);
      }
    };

    if (societyName) {
      getMembers();
    }
  }, [societyName]);

  // Get the current date and set it to the 1st of the current month
  const getFirstDayOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  };
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());

  // Outputs "01 Jan 2025"
  const formatDateIntl = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  useEffect(() => {
    if (!paymentModeOptions.some((option) => option.value === "All")) {
      paymentModeOptions.push({ label: "All", value: "All" });
      paymentModeOptions.sort((a, b) => a.label.localeCompare(b.label));
    }
  }, []);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const { accountFromOptions } =
          await fetchbankCashAccountOptions(societyName);
        accountFromOptions.push({ label: "All", value: "All", group: "All" });
        // Sort alphabetically by the `label` field
        accountFromOptions.sort((a, b) => a.label.localeCompare(b.label));
        // Update the state with the sorted options
        setLedgerOptions(accountFromOptions);
      } catch (error) {
        console.log("error", error);
        Alert.alert("Error", "Failed to fetch account options.");
      }
    };

    fetchOptions();
  }, []);

  const fetchUnclearedBalance = async () => {
    try {
      const unclearedBalanceQuery = query(
        collectionGroup(db, unclearedBalanceSubcollectionName),
        where("societyName", "==", societyName),
        where("status", "==", "Cleared") // ✅ Only fetch docs with status = "Cleared"
      );
      const unclearedBalanceQuerySnapshot = await getDocs(
        unclearedBalanceQuery
      );

      const unclearedBalanceList: any[] = [];

      unclearedBalanceQuerySnapshot.forEach((doc) => {
        const unclearedBalanceData = doc.data();
        const unclearedBalanceId = doc.id;

        const docPath = doc.ref.path;
        const pathSegments = docPath.split("/");
        const wing = pathSegments[3];
        const floor = pathSegments[5];
        const flatNumber = pathSegments[7];

        unclearedBalanceList.push({
          wing,
          floor,
          flatNumber,
          type: unclearedBalanceData.type,
          // index, // Include index for unique identification
          amount: unclearedBalanceData.amountReceived,
          voucherNumber: unclearedBalanceData.voucherNumber,
          paymentDate: unclearedBalanceData.paymentReceivedDate,
          ledgerAccount: unclearedBalanceData.ledgerAccount,
          ledgerAccountGroup: unclearedBalanceData.ledgerAccountGroup,
          paymentMode: unclearedBalanceData.paymentMode,
          selectedIds: unclearedBalanceData.selectedIds ?? [], // Default to an empty array if undefined,
          transactionId: unclearedBalanceId,
          selectedBills: unclearedBalanceData.selectedBills ?? [],
          status: unclearedBalanceData.status,
        });

        setUnclearedBalance(unclearedBalanceList);
        setOriginalBalance(unclearedBalanceList);
      });
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchUnclearedBalance();
  }, []);

  const applyFilters = () => {
    setIsModalVisible(false);

    const filteredData = unclearedBalance.filter((item) => {
      // Filter by date range
      const itemDate = new Date(item.paymentDate); // Assuming `item.date` is a string in a valid date format
      const isWithinDateRange = itemDate >= fromDate && itemDate <= toDate;

      // Filter by ledger
      const matchesLedger = ledger === "All" || item.ledgerAccount === ledger;

      // Filter by payment method
      const matchesPaymentMethod =
        paymentMethod === "All" || item.paymentMode === paymentMethod;

      // Filter by members
      const matchesMembers =
        selectedMembers.length === 0 ||
        selectedMembers.includes(`${item.wing} ${item.flatNumber}`);

      // Include item if it matches all filters
      return (
        isWithinDateRange &&
        matchesLedger &&
        matchesPaymentMethod &&
        matchesMembers
      );
    });

    setUnclearedBalance(filteredData);
  };

  const resetFilters = () => {
    setIsModalVisible(true);
    setUnclearedBalance(originalBalance); // Set to the original data
    // setFromDate(new Date("2025-01-01"));
    // setToDate(new Date("2025-01-06"));
    // setLedger("All");
    // setPaymentMethod("All");
    //setSelectedMembers([]);
  };

  useEffect(() => {
    if (originalBalance.length > 0) {
      applyFilters(); // Apply filters after data fetch
    }
  }, [originalBalance]);

  const [menuVisible, setMenuVisible] = useState(false);
  const handleMenuOptionPress = (option: string) => {
    console.log(`${option} selected`);
    setMenuVisible(false);
  };
  const closeMenu = () => {
    setMenuVisible(false);
  };

  return (
    <TouchableWithoutFeedback onPress={closeMenu}>
      <View style={styles.container}>
        {/* Remove Stack Header */}
        <Stack.Screen options={{ headerShown: false }} />

        {/* Top Appbar */}
        <AppbarComponent
          title="Receipt Summary"
          source="Admin"
          onPressFilter={() => resetFilters()}
          onPressThreeDot={() => setMenuVisible(!menuVisible)}
        />

        {/* Three-dot Menu */}
        {/* Custom Menu */}
        {menuVisible && (
          <AppbarMenuComponent
            items={["Download PDF", "Download Excel", "Print"]}
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

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <Card style={styles.totalCard}>
            <Card.Content>
              <Text style={styles.totalTitle}>Total Cash</Text>
              <Text style={styles.totalAmount}>
                ₹{" "}
                {unclearedBalance
                  .filter((item) => item.ledgerAccount === "Cash")
                  .reduce((sum, item) => sum + parseFloat(item.amount), 0)
                  .toFixed(2)}
              </Text>
            </Card.Content>
          </Card>
          <Card style={styles.totalCard}>
            <Card.Content>
              <Text style={styles.totalTitle}>Total Bank</Text>
              <Text style={styles.totalAmount}>
                ₹{" "}
                {unclearedBalance
                  .filter((item) => item.ledgerAccount === "Bank")
                  .reduce((sum, item) => sum + parseFloat(item.amount), 0)
                  .toFixed(2)}
              </Text>
            </Card.Content>
          </Card>
        </View>
        <Divider />

        {/* Receipt List */}
        <FlatList
          data={unclearedBalance}
          keyExtractor={(item) =>
            `${item.type}-${item.index}-${item.voucherNumber || ""}-${
              item.flatNumber
            }`
          }
          renderItem={({ item }) => (
            <Card
              style={styles.receiptCard}
              onPress={() =>
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
                })
              }
            >
              <Card.Content>
                <Text style={styles.receiptId}>{item.voucherNumber}</Text>

                <View style={styles.transactioncontent}>
                  <View style={styles.transactionLeft}>
                    <Text>
                      Received From: {item.wing} {item.flatNumber}
                    </Text>
                    <Text>{item.status}</Text>
                    <Text>Ledger Name: {item.ledgerAccount}</Text>
                    <Text>Payment Mode: {item.paymentMode}</Text>
                    {item.bankName && <Text>Bank Name: {item.bankName}</Text>}
                    {item.chequeNo && <Text>Cheque No: {item.chequeNo}</Text>}
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={styles.receiptAmount}>
                      ₹ {parseFloat(item.amount).toFixed(2)}
                    </Text>
                    <Text style={styles.receiptDate}>{item.paymentDate}</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}
          ItemSeparatorComponent={() => <Divider />}
          contentContainerStyle={styles.listContent}
        />

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

              {/*  Members */}

              <View style={styles.section}>
                <Text style={styles.label}>Members</Text>
                <DropdownMultiSelect
                  options={members}
                  onChange={setSelectedMembers}
                  placeholder="Select Members"
                  selectedValues={selectedMembers}
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
              <View style={styles.section}>
                <Text style={styles.label}>Payment Mode</Text>
                <Dropdown
                  data={paymentModeOptions}
                  onChange={setPaymentMethod}
                  placeholder="Select Payment Method"
                  initialValue={paymentMethod}
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
      </View>
    </TouchableWithoutFeedback>
  );
};

export default ReceiptSummary;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  summaryHeader: { padding: 16 },
  summaryText: { fontSize: 14, color: "#666" },
  totalsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
  },
  totalCard: { flex: 1, marginHorizontal: 8, backgroundColor: "#E3F2FD" },
  totalTitle: { fontSize: 14, color: "#666" },
  totalAmount: { fontSize: 20, fontWeight: "bold", color: "#000" },
  receiptCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: "#fff",
    elevation: 2,
  },
  receiptId: { fontWeight: "bold", marginBottom: 4 },
  receiptAmount: { fontSize: 16, fontWeight: "bold", color: "#4CAF50" },
  receiptDate: { fontSize: 12, color: "#666" },
  listContent: { paddingBottom: 16 },

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
  section: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  applyButton: { marginTop: 20 },

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
