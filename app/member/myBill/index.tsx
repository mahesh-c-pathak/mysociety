import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import {
  Button,
  Card,
  Text,
  TouchableRipple,
  Checkbox,
  Divider,
} from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSociety } from "@/utils/SocietyContext";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { calculatePenaltyNew } from "@/utils/calculatePenaltyNew";
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";
import AppbarComponent from "@/components/AppbarComponent";
import { getFlatCurrentBalance } from "@/utils/getFlatCurrentBalance";

interface BillsData {
  id: string;
  title: string;
  date?: string;
  unpaidAmount?: number;
  paidAmount?: number;
  dueDate: string;
  overdueDays: number; // Include overdueDays
  amount: number; // Include amount
  status: string; // Include status (e.g., 'unpaid', 'paid', etc.)
  isEnablePenalty?: boolean; // Add this
  Occurance?: string; // Add this
  recurringFrequency?: string; // Add this
  penaltyType?: string; // Add this
  fixPricePenalty?: string; // Add this
  percentPenalty?: string; // Add this
  ledgerAccountPenalty?: string; // Add this
  ledgerAccountGroupPenalty?: string; // Add this
  penaltyAmount?: number;
  amountToPay?: number;
  receiptAmount?: number;
  masterBillId: string;
}

const Index = () => {
  const [bills, setBills] = useState<BillsData[]>([]);
  const [selectedBills, setSelectedBills] = useState<string[]>([]); // NEW STATE
  const [activeTab, setActiveTab] = useState<"Unpaid" | "Paid">("Unpaid");
  const [unclearedBalance, setUnclearedBalance] = useState<number>(0); // NEW STATE

  const router = useRouter();
  const { source } = useLocalSearchParams();
  const localParams = useLocalSearchParams();
  const societyContext = useSociety();
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [deposit, setDeposit] = useState<number>(0);
  const insets = useSafeAreaInsets();

  useCustomBackHandler("/member"); // back always goes to Screen3

  // Determine params based on source
  const societyName =
    source === "Admin" ? localParams.societyName : societyContext.societyName;
  const wing = source === "Admin" ? localParams.wing : societyContext.wing;
  const flatNumber =
    source === "Admin" ? localParams.flatNumber : societyContext.flatNumber;
  const floorName =
    source === "Admin" ? localParams.floorName : societyContext.floorName;

  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;
  // const customFlatsBillsSubcollectionName = `${societyName} bills`;
  const customFlatsBillsSubcollectionName = "flatbills";

  const unclearedBalanceSubcollectionName = "unclearedBalances";

  const dateString = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  // const unclearedBalanceSubcollectionName = `unclearedBalances_${societyName}`;
  //const specialBillCollectionName = `specialBills_${societyName}`;
  const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;

  useEffect(() => {
    fetchBills();
    fetchUnclearedBalance(); // Fetch uncleared balance
  }, []);

  // Fetch and filter bills for the specific flat

  const fetchBills = async () => {
    try {
      const billsData: BillsData[] = []; // Explicitly define the type for billsData

      const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
      const flatDocRef = doc(db, flatRef);
      const billsCollectionRef = collection(
        flatDocRef,
        customFlatsBillsSubcollectionName
      );

      // const dateString = new Date().toISOString().split("T")[0];

      // const currentBalanceSubcollectionName = `currentBalance_${flatNumber}`;
      // const currentBalanceSubcollectionName = "flatCurrentBalance";

      const depositSubcollectionName = `deposit_${flatNumber}`;
      const depositCollection = collection(
        flatDocRef,
        depositSubcollectionName
      );
      const depositQuery = query(
        depositCollection,
        where("date", "<=", dateString),
        orderBy("date", "desc"),
        limit(1)
      );

      // Fetch both collections in parallel
      const [flatbillCollection, depositsnapshot] = await Promise.all([
        getDocs(billsCollectionRef),

        getDocs(depositQuery),
      ]);

      // set current balance
      // Read current balance (read only; safe in parallel)
      const currentFlatBalanceValue = await getFlatCurrentBalance(flatRef);
      setCurrentBalance(currentFlatBalanceValue);

      // set Deposit
      if (!depositsnapshot.empty) {
        const data = depositsnapshot.docs[0].data();
        setDeposit(data.cumulativeBalance); // Use cumulativeBalance or default to 0
      }

      // Use `for...of` instead of `.forEach()` to support `await`
      for (const billDoc of flatbillCollection.docs) {
        const billData = billDoc.data();
        const billStatus = billData.status;
        const billAmount = billData.amount || 0;
        const masterBillId = billData.masterBillId;

        // Construct bill object
        const billObject: BillsData = {
          id: billDoc.id,
          title: billData.name || "My bill",
          dueDate: billData.dueDate,
          overdueDays: calculateOverdueDays(
            billData.dueDate,
            billData.paymentDate
          ),
          amount: billAmount,
          status: billStatus,
          masterBillId,
        };

        if (billStatus !== "paid") {
          const billRef = `Bills/${billDoc.id}`;
          const billMainDocRef = doc(db, billRef);
          const billMainDocSnap = await getDoc(billMainDocRef);

          if (billMainDocSnap.exists()) {
            const billMainData = billMainDocSnap.data();

            // Add penalty-related fields to the billObject
            billObject.isEnablePenalty =
              billMainData.isEnablePenalty === "true"; // Convert string to boolean
            billObject.Occurance = billMainData.Occurance ?? "";
            billObject.recurringFrequency =
              billMainData.recurringFrequency ?? "";
            billObject.penaltyType = billMainData.penaltyType ?? "";
            billObject.fixPricePenalty = billMainData.fixPricePenalty ?? "";
            billObject.percentPenalty = billMainData.percentPenalty ?? "";
            billObject.ledgerAccountPenalty =
              billMainData.ledgerAccountPenalty ?? "";
            billObject.ledgerAccountGroupPenalty =
              billMainData.ledgerAccountGroupPenalty ?? "";
            // Determine penalty parameters
            const penaltyOccurrence =
              billMainData.Occurance === "Recurring" ? "Recurring" : "One Time";
            const penaltyRecurringFrequency =
              penaltyOccurrence === "Recurring"
                ? billMainData.recurringFrequency
                : null;
            const penaltyValue =
              billMainData.penaltyType === "Percentage"
                ? parseFloat(billMainData.percentPenalty)
                : parseFloat(billMainData.fixPricePenalty);
            // Convert dueDate string to Date object
            const dueDate = new Date(billData.dueDate);

            // Calculate penalty
            billObject.penaltyAmount = calculatePenaltyNew(
              dueDate,
              billAmount,
              penaltyOccurrence,
              penaltyRecurringFrequency,
              billMainData.penaltyType,
              penaltyValue
            );
            billObject.amountToPay = billAmount + billObject.penaltyAmount;
          }
        } else if (billStatus === "paid") {
          billObject.overdueDays = billData.overdueDays || 0;
          billObject.receiptAmount = billData.receiptAmount || 0;
          billObject.penaltyAmount = billData.penaltyAmount || 0;
        }

        billsData.push(billObject);
      }

      setBills(billsData);
    } catch (error) {
      console.error("Error fetching bills:", error);
    }
  };

  const fetchUnclearedBalance = async () => {
    try {
      // Reference to the uncleared balance subcollection
      const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
      const flatDocRef = doc(db, flatRef);
      const unclearedBalanceRef = collection(
        flatDocRef,
        unclearedBalanceSubcollectionName
      );

      // Query to fetch all documents with status "Uncleared"
      const querySnapshot = await getDocs(
        query(
          unclearedBalanceRef,
          where("societyName", "==", societyName),
          where("status", "==", "Uncleared")
        )
      );

      let totalUnclearedBalance = 0; // Temporary variable to calculate the total balance

      // Iterate over the query results
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        const amountPaid = docData.amountPaid || 0; // Use 0 as default if amountPaid is undefined
        totalUnclearedBalance += amountPaid; // Accumulate the amount
      });

      // Update the state with the calculated total
      setUnclearedBalance(totalUnclearedBalance);
    } catch (error) {
      console.error("Error fetching uncleared balance:", error);
    }
  };

  const calculateOverdueDays = (dueDate: string, paymentDate?: string) => {
    const referenceDate = paymentDate ? new Date(paymentDate) : new Date();
    const due = new Date(dueDate);
    const diffTime = referenceDate.getTime() - due.getTime();
    return Math.max(Math.floor(diffTime / (1000 * 60 * 60 * 24)), 0);
  };

  const toggleSelection = (id: string) => {
    setSelectedBills((prev) =>
      prev.includes(id) ? prev.filter((billId) => billId !== id) : [...prev, id]
    );
  };

  const renderBillItem = ({ item }: { item: any }) => {
    if (
      activeTab === "Unpaid" &&
      !["unpaid", "Pending Approval"].includes(item.status)
    ) {
      return null;
    }
    if (activeTab === "Paid" && item.status !== "paid") {
      return null;
    }

    const isSelected = selectedBills.includes(item.id);

    return (
      <Card style={styles.card} elevation={1}>
        <Card.Content>
          <View style={styles.row}>
            <Checkbox
              status={isSelected ? "checked" : "unchecked"}
              onPress={() => toggleSelection(item.id)}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.billTitle}>{item.title}</Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text>Bill Amount</Text>
                <Text style={styles.amountText}>
                  ₹ {item.amount.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.dueDate}>Due Date: {item.dueDate}</Text>
              {item.overdueDays > 0 && item.status !== "paid" && (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text>Penalty</Text>
                    <Text style={styles.amountText}>
                      ₹ {item.penaltyAmount}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text>Amount To Be Paid</Text>
                    <Text style={styles.amountText}>₹ {item.amountToPay}</Text>
                  </View>
                  <Text style={styles.overdue}>
                    Overdue by {item.overdueDays} days
                  </Text>
                </>
              )}
              {item.status === "paid" && (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text>Penalty</Text>
                    <Text style={styles.amountText}>
                      ₹ {item.penaltyAmount}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text>Amount Paid</Text>
                    <Text style={styles.amountText}>
                      ₹ {item.receiptAmount.toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const totalDue = bills
    .filter((b) => b.status === "unpaid")
    .reduce((sum, b) => sum + (b.amountToPay ?? b.amount), 0);

  const handlePayNow = () => {
    const selectedItems = bills.filter((bill) =>
      selectedBills.includes(bill.id)
    );
    const totalAmount = selectedItems.reduce(
      (sum, bill) => sum + (bill.amountToPay ?? bill.amount),
      0
    );

    //const unclearedBalance = 0; // Replace with actual uncleared balance logic if needed

    router.push({
      pathname: "/member/myBill/MakePayments",
      params: {
        selectedIds: JSON.stringify(selectedBills),
        totalAmount: totalAmount.toFixed(2),
        totalDue: totalDue.toFixed(2),
        currentBalance: currentBalance.toFixed(2),
        unclearedBalance: unclearedBalance.toFixed(2),
        selectedBills: JSON.stringify(selectedItems), // Pass all selected bill details
        flatRef,
        societyName,
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Appbar */}

      <AppbarComponent title="My Bills" />

      {/* Balance Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryTitle}>Total Due</Text>
          <Text style={styles.summaryValue}>₹ {totalDue.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryTitle}>Current Balance</Text>
          <Text style={styles.summaryValue}>₹ {currentBalance.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryTitle}>Deposit</Text>
          <Text style={styles.summaryValue}>₹ {deposit.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryTitle}>Uncleared Balance</Text>
          <Text style={styles.summaryValue}>
            ₹ {unclearedBalance.toFixed(2)}
          </Text>
        </View>
      </View>

      <Divider style={{ backgroundColor: "white", height: 1 }} />

      {/* Wallet and My Statement Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/member/myBill/Wallet")}
        >
          <Text style={styles.actionText}>Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.activeActionButton]}
          onPress={() => router.push("/member/myBill/MyStatement")}
        >
          <Text style={[styles.actionText, styles.activeActionText]}>
            My Statement
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableRipple
          style={[styles.tabButton, activeTab === "Unpaid" && styles.activeTab]}
          onPress={() => setActiveTab("Unpaid")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "Unpaid" && styles.activeTabText,
            ]}
          >
            Unpaid
          </Text>
        </TouchableRipple>
        <TouchableRipple
          style={[styles.tabButton, activeTab === "Paid" && styles.activeTab]}
          onPress={() => setActiveTab("Paid")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "Paid" && styles.activeTabText,
            ]}
          >
            Paid
          </Text>
        </TouchableRipple>
      </View>

      {/* Bill List */}
      <FlatList
        data={bills.filter((bill) =>
          activeTab === "Unpaid"
            ? ["unpaid", "Pending Approval"].includes(bill.status)
            : bill.status === "paid"
        )}
        keyExtractor={(item) => item.id}
        renderItem={renderBillItem}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: insets.bottom + 200 },
        ]}
        ListEmptyComponent={
          <Text style={styles.emptyMessage}>
            {activeTab === "Unpaid" ? "No Unpaid Bills" : "No Paid Bills"}
          </Text>
        }
      />

      {/* Pay Now Button */}
      <View style={[styles.footer, { bottom: insets.bottom }]}>
        <Button
          mode="contained"
          style={styles.payButton}
          onPress={handlePayNow}
        >
          Pay Now
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#2196F3",
  },
  summaryItem: { alignItems: "center" },
  summaryTitle: { color: "white", fontSize: 12 },
  summaryValue: { color: "white", fontWeight: "bold", fontSize: 16 },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#E3F2FD",
  },
  tabButton: { padding: 12 },
  activeTab: { borderBottomWidth: 2, borderColor: "#2196F3" },
  tabText: { fontSize: 16, color: "#888" },
  activeTabText: { color: "#2196F3", fontWeight: "bold" },
  listContainer: { paddingHorizontal: 16, paddingTop: 8 },
  card: { marginVertical: 8 },
  billTitle: { fontWeight: "bold", fontSize: 16 },
  overdue: { color: "red", fontSize: 12 },
  amountText: { color: "red", fontSize: 16 },
  dueDate: { color: "#555", fontSize: 12 },
  payButton: { margin: 16, backgroundColor: "#2196F3" },
  emptyMessage: {
    textAlign: "center",
    fontSize: 16,
    color: "#888",
    marginVertical: 20,
  },
  row: { flexDirection: "row", alignItems: "center" },

  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#2196F3",
    padding: 10,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
  },
  activeActionButton: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2196F3",
  },
  activeActionText: {
    color: "#2196F3",
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

export default Index;
