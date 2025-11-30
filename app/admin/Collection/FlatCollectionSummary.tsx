import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useSociety } from "../../../utils/SocietyContext";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import {
  collection,
  getDocs,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDoc,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import {
  Appbar,
  Button,
  Card,
  Text,
  TouchableRipple,
  Avatar,
  Menu,
  Divider,
  Checkbox,
} from "react-native-paper";

import { useCustomBackHandler } from "@/utils/useCustomBackHandler";
import { getFlatCurrentBalance } from "@/utils/getFlatCurrentBalance";

interface BillItem {
  itemName: string;
  ledgerAccount: string;
  updatedLedgerAccount: string;
}

interface BillsData {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: string;
  overdueDays: number;
  date?: string; // Make optional if not always available
  unpaidAmount?: number;
  paidAmount?: number;
  billItems?: BillItem[]; // Array of filtered BillItem objects
}

interface UnclearedBalance {
  amount: number;
  paymentDate: string;
  paymentMode: string;
  transactionId: string;
  bankName: string;
  chequeNo: string;
  status: string;
  selectedIds: any;
  selectedBillsProperties: any;
  privateFilePath?: string; // ✅ add this
  userIds?: string[]; // ✅ Add this
}

const FlatCollectionSummary = () => {
  const router = useRouter();
  useCustomBackHandler("/admin/Collection"); // back always goes to Screen3
  const { societyName } = useSociety();
  const params = useLocalSearchParams();
  const [bills, setBills] = useState<BillsData[]>([]);
  const [unclearedBalances, setUnclearedBalances] = useState<
    UnclearedBalance[]
  >([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [deposit, setDeposit] = useState<number>(0);

  const wing = params.wing as string;
  const floorName = params.floorName as string;
  const flatNumber = params.flatNumber as string;

  const [menuVisible, setMenuVisible] = useState(false);

  const [selectedBills, setSelectedBills] = useState<string[]>([]); // NEW STATE

  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;
  // const customFlatsBillsSubcollectionName = `${societyName} bills`;
  const customFlatsBillsSubcollectionName = "flatbills";

  // const unclearedBalanceSubcollectionName = `unclearedBalances_${societyName}`;

  const unclearedBalanceSubcollectionName = "unclearedBalances";

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const billsData: BillsData[] = []; // Explicitly define the type for billsData

      const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
      const flatDocRef = doc(db, flatRef);
      const billsCollectionRef = collection(
        flatDocRef,
        customFlatsBillsSubcollectionName
      );
      const flatbillCollection = await getDocs(billsCollectionRef);

      flatbillCollection.forEach((billDoc) => {
        const billData = billDoc.data();
        const billStatus = billData.status;
        const billAmount = billData.amount || 0;

        billsData.push({
          id: billDoc.id,
          title: billData.name || "My bill",
          dueDate: billData.dueDate,
          overdueDays: calculateOverdueDays(billData.dueDate),
          amount: billAmount,
          status: billStatus,
        });
      });
      setBills(billsData);

      // get the flat users
      const flatDocSnap = await getDoc(flatDocRef);
      const flatDetails = flatDocSnap.data();

      const userDetails = flatDetails?.userDetails || {};
      const userIds = Object.keys(userDetails); // ✅ Extract only user IDs (keys)

      // Process uncleared balances
      // Reference to the uncleared balance subcollection
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

      // Extract and typecast document data
      const unclearedBalances: UnclearedBalance[] = querySnapshot.docs.map(
        (doc) => {
          const data = doc.data();

          return {
            amount: data.amountPaid || 0,
            paymentDate: data.paymentDate || "",
            paymentMode: data.paymentMode || "",
            transactionId: data.transactionId || "",
            bankName: data.bankName || "",
            chequeNo: data.chequeNo || "",
            status: data.status || "Uncleared",
            selectedIds: data.selectedIds || [],
            selectedBillsProperties: data.selectedBills || [],
            privateFilePath: data.privateFilePath,
            userIds, // ✅ include flat’s userIds
          };
        }
      );

      // Set state with fetched data
      setUnclearedBalances(unclearedBalances);

      // Set Current Balance and Deposit

      // setDeposit(relevantWing.deposit || 0);
      const depositSubcollectionName = `deposit_${flatNumber}`;
      const depositCollection = collection(
        flatDocRef,
        depositSubcollectionName
      );
      const dateString = new Date().toISOString().split("T")[0];
      const q = query(
        depositCollection,
        where("date", "<=", dateString),
        orderBy("date", "desc"),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setDeposit(data.cumulativeBalance); // Use cumulativeBalance or default to 0
      }
      // setCurrentBalance(relevantWing.currentBalance || 0);
      // const currentBalanceSubcollectionName = `currentBalance_${flatNumber}`;

      // const currentBalanceSubcollectionName = "flatCurrentBalance";
      // Read current balance (read only; safe in parallel)
      const currentFlatBalanceValue = await getFlatCurrentBalance(flatRef);
      setCurrentBalance(currentFlatBalanceValue);
    } catch (error) {
      console.error("Error fetching bills:", error);
    }
  };

  const calculateOverdueDays = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    return Math.max(Math.floor(diffTime / (1000 * 60 * 60 * 24)), 0);
  };

  const handleMakePaidAll = () => {
    if (unclearedBalances.length > 0) {
      alert(
        "Kindly accept or reject uncleared balance from the payment request."
      );
      return; // Prevent further execution
    }
    const selectedItems = bills.filter((bill) =>
      selectedBills.includes(bill.id)
    );
    const totalAmount = selectedItems.reduce(
      (sum, bill) => sum + bill.amount,
      0
    );
    // console.log('totalAmount', totalAmount)
    router.push({
      pathname: "/admin/Collection/MakePaidAll",
      params: {
        wing,
        floorName,
        flatNumber,
        selectedIds: JSON.stringify(selectedBills),
        totalAmount: totalAmount.toFixed(2),
        totalDue: totalDue.toFixed(2),
        currentBalance: currentBalance.toFixed(2),
        unclearedBalance: totalUncleared.toFixed(2),
      },
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedBills((prev) =>
      prev.includes(id) ? prev.filter((billId) => billId !== id) : [...prev, id]
    );
  };

  const renderBillItem = ({ item }: { item: BillsData }) => {
    const isSelected = selectedBills.includes(item.id);
    return (
      <Card style={styles.card} elevation={1}>
        <Card.Content>
          <Text style={styles.billTitle}>{item.title}</Text>
          {/* Conditionally render unpaid amount */}
          {item.overdueDays > 0 && (
            <Text style={styles.overdue}>
              Overdue by {item.overdueDays} days
            </Text>
          )}
          <Text style={styles.dueDate}>{item.dueDate}</Text>
          <Text style={styles.amount}>₹ {item.amount.toFixed(2)}</Text>
          <Text style={styles.status}>{item.status.toUpperCase()}</Text>
          <TouchableOpacity
            style={styles.actionButtonview}
            onPress={() =>
              router.push({
                pathname: "/admin/Bills/BillDetailPerFlatNew",
                params: {
                  source: "Admin",
                  societyName,
                  wing: wing,
                  floorName: floorName,
                  flatNumber: flatNumber,
                  billNumber: item.id,
                  amount: item.amount.toFixed(2),
                  status: item.status,
                },
              })
            }
          >
            <Text style={styles.actionText}>View</Text>
          </TouchableOpacity>

          <View style={styles.checkbox}>
            <Checkbox
              status={isSelected ? "checked" : "unchecked"}
              onPress={() => toggleSelection(item.id)}
            />
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderUnclearedItem = ({ item }: { item: UnclearedBalance }) => (
    <TouchableRipple
      onPress={() => {
        router.push({
          pathname: "/admin/Collection/paymentRecipt",
          params: {
            wing: wing,
            floorName: floorName,
            flatNumber: flatNumber,
            totalDue,
            currentBalance,
            totalUncleared,
            amount: item.amount.toFixed(2),
            paymentDate: item.paymentDate,
            paymentMode: item.paymentMode,
            transactionId: item.transactionId,
            selectedIds: JSON.stringify(item.selectedIds),
            bankName: item.bankName,
            chequeNo: item.chequeNo,
            selectedBillsProperties: JSON.stringify(
              item.selectedBillsProperties
            ),
            privateFilePath: item.privateFilePath || "", // ✅ now sending
            userIds: JSON.stringify(item.userIds || []), // ✅ pass userIds here
            // Add other necessary params if available
          },
        });
      }}
      rippleColor="rgba(0, 0, 0, 0.2)"
    >
      <Card style={styles.paymentRequestCard} elevation={1}>
        <Card.Content>
          <Text style={styles.paymentRequestTitle}>Add Money</Text>
          <Text style={styles.paymentDate}>{item.paymentDate}</Text>
          <Text style={styles.paymentAmount}>₹ {item.amount.toFixed(2)}</Text>
          <View style={styles.unclearedStatusContainer}>
            <Text style={styles.unclearedStatus}>Uncleared</Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableRipple>
  );

  const totalUncleared = unclearedBalances.reduce(
    (sum, b) => sum + b.amount,
    0
  );

  const totalDue = bills
    .filter((b) => b.status === "unpaid")
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <View style={styles.container}>
      {/* Remove Stack Header */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Appbar Header */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content
          title="Flat Collection Summary"
          titleStyle={styles.titleStyle}
        />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="dots-vertical"
              color="#fff"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item onPress={() => {}} title="Wallet" />
          <Menu.Item onPress={() => {}} title="Advanced Payment" />
          <Menu.Item onPress={() => {}} title="Refund Payment" />
          <Menu.Item onPress={() => {}} title="Receipts" />
          <Menu.Item onPress={() => {}} title="Statement" />
        </Menu>
      </Appbar.Header>

      {/* Profile Header */}
      <View style={styles.profileContainer}>
        <Avatar.Text size={44} label="XD" style={styles.avatar} />
        <View style={styles.textContainer}>
          <Text style={styles.profileText}>
            {wing} {flatNumber}
          </Text>
        </View>
      </View>

      <Divider style={{ backgroundColor: "white", height: 1 }} />

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
          <Text style={styles.summaryValue}>₹ {totalUncleared.toFixed(2)}</Text>
        </View>
      </View>

      <Divider style={{ backgroundColor: "white", height: 1 }} />

      {/* Wallet, Advance and Refund Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            router.push({
              pathname: "/member/myBill/Wallet",
              params: {
                source: "Admin",
                societyName,
                wing: wing,
                floorName: floorName,
                flatNumber: flatNumber,
              },
            })
          }
        >
          <Text style={styles.actionText}>Wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            router.push({
              pathname: "/admin/Collection/Advance",
              params: {
                wing: wing,
                floorName: floorName,
                flatNumber: flatNumber,
              },
            })
          }
        >
          <Text style={styles.actionText}>Advance</Text>
        </TouchableOpacity>

        {/* Conditionally render Refund button */}
        {currentBalance > 0 && (
          <TouchableOpacity
            style={[styles.actionButton, styles.activeActionButton]}
            onPress={() =>
              router.push({
                pathname: "/admin/Collection/Refund",
                params: {
                  wing: wing,
                  floorName: floorName,
                  flatNumber: flatNumber,
                  currentBalance: currentBalance.toString(), // Convert number to string
                },
              })
            }
          >
            <Text style={[styles.actionText, styles.activeActionText]}>
              Refund
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView>
        {/* Payment Request Section */}
        {unclearedBalances.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Payment Request</Text>
            <FlatList
              data={unclearedBalances}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderUnclearedItem}
              contentContainerStyle={styles.listContainer}
              scrollEnabled={false} // Disable scrolling
            />
          </View>
        )}

        {/* Bills Section */}

        <View>
          <Text style={styles.sectionTitle}>Bills</Text>
          {bills.filter((bill) => bill.status === "unpaid").length > 0 ? (
            <FlatList
              data={bills.filter((bill) => bill.status === "unpaid")}
              keyExtractor={(item) => item.id}
              renderItem={renderBillItem}
              contentContainerStyle={styles.listContainer}
              scrollEnabled={false} // Disable scrolling
            />
          ) : (
            <View style={styles.noBillsContainer}>
              <Text style={styles.noBillsText}>No Pending Bills</Text>
            </View>
          )}
        </View>

        {bills.filter((bill) => bill.status === "unpaid").length > 0 && (
          <Button
            mode="contained"
            style={styles.payButton}
            onPress={() => handleMakePaidAll()}
          >
            Make Paid All
          </Button>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { backgroundColor: "#6200ee" },
  titleStyle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#6200ee",
  },
  summaryItem: { alignItems: "center" },
  summaryTitle: { color: "white", fontSize: 12 },
  summaryValue: { color: "white", fontWeight: "bold", fontSize: 12 },
  listContainer: { paddingHorizontal: 16, paddingTop: 8 },
  card: { marginVertical: 8 },
  billTitle: { fontWeight: "bold", fontSize: 16 },
  overdue: { color: "red", fontSize: 12 },
  dueDate: { color: "#555", fontSize: 12 },
  amount: {
    position: "absolute",
    right: 0,
    top: 40,
    color: "red",
    fontWeight: "bold",
    marginHorizontal: 10,
  },
  status: { fontSize: 12, color: "gray", marginTop: 4 },
  payButton: { margin: 16, backgroundColor: "#2196F3" },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    backgroundColor: "#6200ee",
  },
  profileText: {
    fontSize: 14,
    color: "white",
  },
  textContainer: {
    justifyContent: "center",
  },
  avatar: {
    backgroundColor: "#6200ee",
    marginRight: 10,
    borderColor: "#fff",
    borderWidth: 2, // 👈 Add this
  },
  unclearedStatusContainer: {
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    alignSelf: "flex-end",
  },
  unclearedStatus: { color: "white", fontSize: 12 },
  sectionTitle: { fontWeight: "bold", fontSize: 18, margin: 16 },
  paymentRequestCard: { backgroundColor: "#fcbf49", marginVertical: 8 },
  paymentRequestTitle: { fontWeight: "bold", fontSize: 16, color: "#333" },
  paymentDate: { color: "#555", fontSize: 12 },
  paymentAmount: {
    fontWeight: "bold",
    fontSize: 16,
    position: "absolute",
    right: 10,
    top: 15,
  },
  noBillsContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  noBillsText: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
  },

  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#6200ee",
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
  actionButtonview: {
    width: 60,
    right: 0,
    top: 60,
    position: "absolute",
    marginHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#D6F6D5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  checkbox: {
    right: 0,
    top: 5,
    position: "absolute",
    marginHorizontal: 10,
  },
});

export default FlatCollectionSummary;
