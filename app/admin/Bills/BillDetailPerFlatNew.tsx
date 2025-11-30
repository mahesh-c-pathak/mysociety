import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Avatar, Divider } from "react-native-paper";
import { useSociety } from "@/utils/SocietyContext";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { calculatePenaltyNew } from "@/utils/calculatePenaltyNew";

import AppbarComponent from "@/components/AppbarComponent";
import AppbarMenuComponent from "@/components/AppbarMenuComponent";
import { updateLedger } from "@/utils/updateLedger";
import { updateFlatCurrentBalance } from "@/utils/updateFlatCurrentBalance";
import { getFlatCurrentBalance } from "@/utils/getFlatCurrentBalance";

interface BillData {
  billNumber: string;
  billAmount: number;
  billinvoiceDate: string;
  title: string;
  dueDate: string;
  billStatus: string;
  items: any;
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
  overdueDays?: number; // Include overdueDays
  transactionId?: string;
  amountReceived?: number;
  billItemTotals?: any;
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

const BillDetailPerFlatNew = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    wing,
    floorName,
    flatNumber,
    billNumber: billNumberparam,
    flatType,
    billStatus,
    id,
  } = useLocalSearchParams();
  const { societyName } = useSociety();
  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;
  // const customFlatsBillsSubcollectionName = `${societyName} bills`;
  const customFlatsBillsSubcollectionName = "flatbills";

  // const specialBillCollectionName = `specialBills_${societyName}`;

  // const unclearedBalanceSubcollectionName = `unclearedBalances_${societyName}`;

  const unclearedBalanceSubcollectionName = "unclearedBalances";

  const billNumber = billNumberparam as string;

  const [billData, setBillData] = useState<any>(null);

  const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
  const dateString = new Date().toISOString().split("T")[0];

  const flatBillRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}/${customFlatsBillsSubcollectionName}/${billNumber}`;

  const [unclearedBalances, setUnclearedBalances] = useState<
    UnclearedBalance[]
  >([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [deposit, setDeposit] = useState<number>(0);
  const [totalDue, setTotalDue] = useState(0);
  const currentDate = new Date().toISOString().split("T")[0];

  // console.log("billData", billData);

  // console.log("Bill Items:", JSON.stringify(billData[0].items, null, 2));

  useEffect(() => {
    if (billStatus !== "No Bill") {
      fetchBillData();
    }
  }, []);

  const fetchBillData = async () => {
    try {
      const flatBillDocRef = doc(db, flatBillRef);
      // const flatBillDocSnap = await getDoc(flatBillDocRef);
      // const mainBillRef = `Societies/${societyName}/${specialBillCollectionName}/${billNumber}`;

      const mainBillRef = `Bills/${id}`;
      const mainBillDocRef = doc(db, mainBillRef);
      // const mainBillDocSnap = await getDoc(mainBillDocRef);

      const [flatBillDocSnap, mainBillDocSnap] = await Promise.all([
        getDoc(flatBillDocRef),
        getDoc(mainBillDocRef),
      ]);

      if (!flatBillDocSnap.exists() || !mainBillDocSnap.exists()) {
        console.warn(
          "Either flatBillDocSnap or mainBillDocSnap does not exist."
        );
        return;
      }
      const flatBillDetails = flatBillDocSnap.data();
      // console.log('flatBillDetails', flatBillDetails)
      const mainBillDetails = mainBillDocSnap.data();
      // console.log('mainBillDetails', mainBillDetails)

      // console.log('mainBillDetails.items', mainBillDetails.items)
      const billAmount = flatBillDetails.amount || 0;
      const billStatus = flatBillDetails.status;

      // Push the aggregated bill data
      const billObject: BillData = {
        billNumber,
        billAmount: flatBillDetails.amount,
        title: flatBillDetails.name,
        billinvoiceDate: mainBillDetails.invoiceDate,
        dueDate: mainBillDetails.dueDate,
        billStatus: flatBillDetails.status,
        items: mainBillDetails.items,
        overdueDays: calculateOverdueDays(
          flatBillDetails.dueDate,
          flatBillDetails.paymentDate
        ),
        billItemTotals: flatBillDetails.billItemTotals,
      };

      // Add penalty-related fields to the billObject
      billObject.isEnablePenalty = mainBillDetails.isEnablePenalty === "true"; // Convert string to boolean
      billObject.Occurance = mainBillDetails.Occurance ?? "";
      billObject.recurringFrequency = mainBillDetails.recurringFrequency ?? "";
      billObject.penaltyType = mainBillDetails.penaltyType ?? "";
      billObject.fixPricePenalty = mainBillDetails.fixPricePenalty ?? "";
      billObject.percentPenalty = mainBillDetails.percentPenalty ?? "";
      billObject.ledgerAccountPenalty =
        mainBillDetails.ledgerAccountPenalty ?? "";
      billObject.ledgerAccountGroupPenalty =
        mainBillDetails.ledgerAccountGroupPenalty ?? "";

      if (flatBillDetails.status !== "paid") {
        // Determine penalty parameters
        const penaltyOccurrence =
          mainBillDetails.Occurance === "Recurring" ? "Recurring" : "One Time";
        const penaltyRecurringFrequency =
          penaltyOccurrence === "Recurring"
            ? mainBillDetails.recurringFrequency
            : null;
        const penaltyValue =
          mainBillDetails.penaltyType === "Percentage"
            ? parseFloat(mainBillDetails.percentPenalty)
            : parseFloat(mainBillDetails.fixPricePenalty);
        // Convert dueDate string to Date object
        const dueDatedateType = new Date(mainBillDetails.dueDate);

        // Calculate penalty
        billObject.penaltyAmount = calculatePenaltyNew(
          dueDatedateType,
          billAmount,
          penaltyOccurrence,
          penaltyRecurringFrequency,
          mainBillDetails.penaltyType,
          penaltyValue
        );
        billObject.amountToPay = billAmount + billObject.penaltyAmount;
      } else if (billStatus === "paid") {
        billObject.overdueDays = flatBillDetails.overdueDays || 0;
        billObject.receiptAmount = flatBillDetails.receiptAmount || 0;
        billObject.penaltyAmount = flatBillDetails.penaltyAmount || 0;
        billObject.transactionId = flatBillDetails.transactionId;
        billObject.amountReceived = flatBillDetails.amountReceived;
      }

      // Add billObject to the array
      const billsData: BillData[] = [billObject];

      // Update state with the fetched bills data
      setBillData(billsData);
      // console.log('billsData', billsData)

      // setCurrentBalance(relevantWing.currentBalance || 0);
      const flatDocRef = doc(db, flatRef);
      // const currentBalanceSubcollectionName = `currentBalance_${flatNumber}`;
      // const currentBalanceSubcollectionName = "flatCurrentBalance";

      // Read current balance (read only; safe in parallel)
      const currentFlatBalanceValue = await getFlatCurrentBalance(flatRef);
      setCurrentBalance(currentFlatBalanceValue);

      // setDeposit(relevantWing.deposit || 0);
      const depositSubcollectionName = `deposit_${flatNumber}`;
      const depositCollection = collection(
        flatDocRef,
        depositSubcollectionName
      );
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

      const billsCollectionRef = collection(
        flatDocRef,
        customFlatsBillsSubcollectionName
      );

      // get all bills for the flat
      let totalUnpaidDue = 0;

      const billsSnapshot = await getDocs(billsCollectionRef);
      billsSnapshot.forEach((doc) => {
        const docData = doc.data();
        const { status, amount = 0 } = docData;

        if (status === "unpaid") {
          totalUnpaidDue += amount; // Accumulate unpaid dues
        }
      });

      setTotalDue(totalUnpaidDue);
    } catch (error) {
      console.error(error);
    }
  };

  const calculateOverdueDays = (dueDate: string, paymentDate?: string) => {
    const referenceDate = paymentDate ? new Date(paymentDate) : new Date();
    const due = new Date(dueDate);
    const diffTime = referenceDate.getTime() - due.getTime();
    return Math.max(Math.floor(diffTime / (1000 * 60 * 60 * 24)), 0);
  };

  // const _goBack = () => console.log('Went back');
  // const _handleMore = () => console.log('Shown more');

  const totalUncleared = unclearedBalances.reduce(
    (sum, b) => sum + b.amount,
    0
  );

  const handleDeleteBill = async () => {
    Alert.alert(
      "Confirmation",
      "Are you sure to delete? You can't recover this data.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            setLoading(true);
            const mainBillRef = `Bills/${id}`;
            const mainBillDocRef = doc(db, mainBillRef);
            const mainBillsSnapshot = await getDoc(mainBillDocRef);
            if (!mainBillsSnapshot.exists()) {
              console.warn("mainBillDocSnap does not exist.");
              return;
            }
            const mainBillData = mainBillsSnapshot.data();
            const { totalBillAmount, totalPaidAmount } = mainBillData;
            let flattotalBillAmount = 0;
            let flattotalPaidAmount = 0;
            try {
              const billItems = billData[0].items || [];
              const status = billData[0].billStatus;
              const isEnablePenalty = billData[0].isEnablePenalty;
              const flatBillAmount = billData[0].billAmount;

              // console.log("billItems", billItems);
              if (status === "unpaid") {
                flattotalBillAmount += flatBillAmount;
                const billTotals = billData[0].billItemTotals || {};

                for (const key in billTotals) {
                  const [ledgerGroup, ledgerAccount] = key.split("||");
                  const amount = billTotals[key];
                  const ledgerAccountReceivables = `${ledgerAccount} Receivables`;

                  // 1. Reverse the income/expense ledger
                  const itemledgerUpdate = await updateLedger(
                    societyName,
                    ledgerGroup,
                    ledgerAccount,
                    amount,
                    "Subtract",
                    currentDate
                  );
                  console.log(`Item Ledger Update Status: ${itemledgerUpdate}`);

                  // 2. Reverse the Account Receivable entry
                  const ledgerUpdateReceivables = await updateLedger(
                    societyName,
                    "Account Receivable",
                    ledgerAccountReceivables, // OR a constant AR account if you use one
                    amount,
                    "Subtract",
                    currentDate
                  );
                  console.log(
                    `Account Receivable Ledger Update Status: ${ledgerUpdateReceivables}`
                  );
                }
              } else if (status === "paid") {
                // Handle paid status
                flattotalBillAmount += flatBillAmount;
                flattotalPaidAmount += flatBillAmount;

                const billTotals = billData[0].billItemTotals || {};

                for (const key in billTotals) {
                  const [ledgerGroup, ledgerAccount] = key.split("||");
                  const amount = billTotals[key];

                  // Only reverse item  ledger
                  const paidStatusledgerUpdate = await updateLedger(
                    societyName,
                    ledgerGroup,
                    ledgerAccount,
                    amount,
                    "Subtract",
                    currentDate
                  );
                  console.log(
                    ` paid status item Ledger Update Status: ${paidStatusledgerUpdate}`
                  );
                }

                // update penalty if exists
                if (isEnablePenalty) {
                  const penaltyAmount = billData[0].penaltyAmount;
                  const billpaidLedgerAccount =
                    billData[0].ledgerAccountPenalty;
                  const billpaidLedgerGroup =
                    billData[0].ledgerAccountGroupPenalty;

                  const LedgerUpdate = await updateLedger(
                    societyName,
                    billpaidLedgerGroup,
                    billpaidLedgerAccount,
                    penaltyAmount,
                    "Subtract",
                    currentDate
                  ); // Update Ledger
                  console.log(` Penalty Ledger Update Status: ${LedgerUpdate}`);
                } // end if isenablepenalty

                // Update Unclread balance selectedBills and selectedIds
                const transactionId = billData[0].transactionId;
                const unclearedBalanceRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}/${unclearedBalanceSubcollectionName}/${transactionId}`;
                const unclearedBalanceDocRef = doc(db, unclearedBalanceRef);
                const docSnap = await getDoc(unclearedBalanceDocRef);
                let amountReceived = 0;

                if (docSnap.exists()) {
                  const data = docSnap.data();
                  // Bill number to delete
                  const billToDelete = billNumber;
                  amountReceived = data.amountReceived;

                  // Remove from selectedIds
                  const updatedSelectedIds =
                    data.selectedIds?.filter(
                      (id: string) => id !== billToDelete
                    ) || [];
                  // Remove from selectedBills
                  const updatedSelectedBills =
                    data.selectedBills?.filter(
                      (bill: any) => bill.id !== billToDelete
                    ) || [];
                  // Update Firestore document
                  await updateDoc(unclearedBalanceDocRef, {
                    selectedIds: updatedSelectedIds,
                    selectedBills: updatedSelectedBills,
                    type: "Bill Deleted",
                  });
                  console.log(
                    "Bill successfully deleted from uncleared balance."
                  );
                }
                // Add the deleted Amount to current Balance
                const receiptAmount = amountReceived;
                // const currentBalanceSubcollectionName = `currentBalance_${flat}`;
                const currentBalanceSubcollectionName = "flatCurrentBalance";
                const currentbalanceCollectionRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}/${currentBalanceSubcollectionName}`;
                const currentbalanceCollectionDocRef = collection(
                  db,
                  currentbalanceCollectionRef
                );

                const result = await updateFlatCurrentBalance(
                  currentbalanceCollectionDocRef,
                  receiptAmount,
                  "Add",
                  currentDate,
                  societyName
                );
                console.log("Balance update result:", result);
                const result2 = await updateLedger(
                  societyName,
                  "Current Liabilities",
                  "Members Advanced",
                  receiptAmount,
                  "Add",
                  currentDate
                ); // Update Ledger
                console.log("Members Advanced update result:", result2);
              } // end else if
              const flatBillDocRef = doc(db, flatBillRef);
              await deleteDoc(flatBillDocRef);
              console.log("Deleted Bill", billNumber, "From Flat", flatNumber);
              // After flat bills delete main bill
              // After deleting flat bill, decide what to do with master bill
              if (flattotalBillAmount === totalBillAmount) {
                // Delete the master bill because only this one existed
                await deleteDoc(mainBillDocRef);
                console.log(
                  "Master bill deleted – only one flat had this bill."
                );
              } else {
                // Update master bill amounts
                const updatedTotalBillAmount =
                  totalBillAmount - flattotalBillAmount;
                const updatedTotalPaidAmount =
                  totalPaidAmount - flattotalPaidAmount;

                await updateDoc(mainBillDocRef, {
                  totalBillAmount: updatedTotalBillAmount,
                  totalPaidAmount: updatedTotalPaidAmount,
                });

                console.log("Master bill updated after removing this flat.");
              }

              // After delete route to "Generate special bill index screen /(SpecialBills) "
              Alert.alert("Success", "Bill  deleted successfully.");
              router.replace({
                pathname: "/admin/Bills/SpecialBills",
              });
            } catch (error) {
              console.error("Something went wrong in handeldelete", error);
            } finally {
              setLoading(false);
            }
          }, // End onPress
        },
      ]
    ); // End Alert
  };

  const [menuVisible, setMenuVisible] = useState(false);

  const handleMenuOptionPress = (option: string) => {
    console.log(`${option} selected`);
    if (option === "Delete") {
      handleDeleteBill();
      setMenuVisible(false);
      return;
    }
    setMenuVisible(false);
  };
  const closeMenu = () => {
    setMenuVisible(false);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={closeMenu}>
      <View style={styles.container}>
        {/* Top Appbar */}
        <AppbarComponent
          title={billNumber as string}
          source="Admin"
          onPressThreeDot={
            billStatus !== "No Bill"
              ? () => setMenuVisible(!menuVisible)
              : undefined
          }
        />

        {/* Three-dot Menu */}
        {/* Custom Menu */}
        {menuVisible && (
          <AppbarMenuComponent
            items={[
              "Edit",
              "Wallet",
              "Advanced Payment",
              "Receipts",
              "Statement",
              "Delete",
            ]}
            onItemPress={handleMenuOptionPress}
            closeMenu={closeMenu}
          />
        )}

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
            <Text style={styles.summaryValue}>
              ₹ {currentBalance.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryTitle}>Deposit</Text>
            <Text style={styles.summaryValue}>₹ {deposit.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryTitle}>Uncleared Balance</Text>
            <Text style={styles.summaryValue}>
              ₹ {totalUncleared.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Bill Details */}
        {billData ? (
          <>
            <View style={styles.billDetails}>
              <View style={styles.billDetailscontent}>
                <View>
                  <Text style={styles.billLabel}>Bill For</Text>
                  <Text style={styles.billValue}>
                    {billData?.[0]?.title || "N/A"}
                  </Text>
                </View>
                <View>
                  <Text style={styles.billDate}>Bill Date</Text>
                  <Text style={styles.billDate}>
                    {billData?.[0]?.billinvoiceDate || "N/A"}
                  </Text>
                </View>
              </View>
              <View style={styles.billDetailscontent}>
                <View>
                  <Text style={styles.dueDate}>Due Date</Text>
                  <Text style={styles.dueDate}>
                    {billData?.[0]?.dueDate || "N/A"}
                  </Text>
                </View>
                <View>
                  <Text
                    style={[
                      styles.status,
                      billData?.[0]?.billStatus === "unpaid"
                        ? styles.unpaid
                        : styles.paid,
                    ]}
                  >
                    {billData?.[0]?.billStatus || "N/A"}
                  </Text>
                </View>
              </View>
              {billData?.[0]?.isEnablePenalty && (
                <>
                  <View style={styles.penaltyContent}>
                    <Text style={styles.penaltyText}>
                      * Notice: A penalty of{" "}
                      {billData?.[0]?.penaltyType === "Fixed Price"
                        ? `₹ ${billData?.[0]?.fixPricePenalty} `
                        : `${billData?.[0]?.percentPenalty}% `}
                      will be applied{" "}
                      {billData?.[0]?.Occurance === "Recurring"
                        ? ` for every ${billData?.[0]?.recurringFrequency} day(s) `
                        : ""}
                      on unpaid balances after {billData?.[0]?.dueDate}. *
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Items Section */}
            {billData[0]?.items && billData[0]?.items.length > 0 ? (
              <View style={styles.itemsSection}>
                <Text style={styles.itemsTitle}>Items</Text>
                {billData[0].items.map(
                  (
                    item: {
                      itemName: string;
                      ownerAmount: number;
                      closedUnitAmount: number;
                      rentAmount: number;
                    },
                    index: number
                  ) => (
                    <View key={index} style={styles.itemRow}>
                      <Text style={styles.itemName}>{item.itemName}</Text>

                      <Text style={styles.itemPrice}>
                        ₹{" "}
                        {(flatType === "Closed"
                          ? item.closedUnitAmount
                          : flatType === "Rent"
                            ? item.rentAmount
                            : item.ownerAmount
                        ).toFixed(2)}
                      </Text>
                    </View>
                  )
                )}
              </View>
            ) : (
              <Text style={{ textAlign: "center", marginTop: 20 }}>
                No items found
              </Text>
            )}
          </>
        ) : (
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            {billStatus === "No Bill" ? "No Bill" : "Loading bill details..."}
          </Text>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default BillDetailPerFlatNew;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  billDetails: {
    backgroundColor: "#ffffff",
    margin: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 3,
  },
  billDetailscontent: {
    flexDirection: "row", // Align Bill For and Bill Date horizontally
    justifyContent: "space-between",
    padding: 1,
  },
  billLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000000",
  },
  billValue: {
    fontSize: 14,
    color: "#000000",
    marginTop: 5,
  },
  billDate: {
    fontSize: 14,
    textAlign: "right",
  },
  dueDate: {
    fontSize: 14,
    marginTop: 5,
  },
  status: {
    fontSize: 14,
    textAlign: "right",
    marginTop: 5,
  },
  penaltyContent: {
    marginTop: 12,
  },
  penaltyText: {
    fontSize: 12,
    color: "#e53935",
  },
  unpaid: {
    fontWeight: "bold",
    color: "#e53935",
  },
  paid: {
    fontWeight: "bold",
    color: "#43a047",
  },
  itemsSection: {
    marginHorizontal: 15,
    marginTop: 10,
    padding: 15,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    elevation: 3,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  itemName: {
    fontSize: 14,
    color: "#000000",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000000",
  },
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
    borderWidth: 2,
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
});
