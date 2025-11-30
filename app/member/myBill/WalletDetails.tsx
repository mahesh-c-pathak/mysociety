import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useSociety } from "@/utils/SocietyContext";
import { Appbar, Card, Text, Divider, Menu } from "react-native-paper";
import { collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";

import { updateLedger } from "@/utils/updateLedger";
import LoadingIndicator from "@/components/LoadingIndicator"; // new import
import { updateFlatCurrentBalance } from "@/utils/updateFlatCurrentBalance";
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";

interface RefundEntry {
  voucherNumber: string;
  amount: number;
  ledgerAccount: string;
}

const WalletDetails = () => {
  const router = useRouter();
  useCustomBackHandler("/member/myBill/Wallet"); // back always goes to Screen3
  const { source, item } = useLocalSearchParams();
  const societyContext = useSociety();
  const localParams = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  // Determine params based on source
  const societyName =
    source === "Admin"
      ? (localParams.societyName as string)
      : societyContext.societyName;
  const wing =
    source === "Admin" ? (localParams.wing as string) : societyContext.wing;
  const flatNumber =
    source === "Admin"
      ? (localParams.flatNumber as string)
      : societyContext.flatNumber;
  const floorName =
    source === "Admin"
      ? (localParams.floorName as string)
      : societyContext.floorName;

  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;
  // const customFlatsBillsSubcollectionName = `${societyName} bills`;

  const customFlatsBillsSubcollectionName = "flatbills";

  // const specialBillCollectionName = `specialBills_${societyName}`;

  // const unclearedBalanceSubcollectionName = `unclearedBalances_${societyName}`;

  const unclearedBalanceSubcollectionName = "unclearedBalances";

  const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;

  // Parse the passed item
  const walletItem = item ? JSON.parse(item as string) : {};
  console.log("walletItem", walletItem);
  // Declare the isDeposit constant
  // const isDeposit = walletItem?.isDeposit || false; // Default to false if isDeposit is not present
  const walletItemTransactionType = walletItem?.type;
  const voucherNumber = walletItem?.voucherNumber;
  const currentDate = new Date().toISOString().split("T")[0];
  const walletItemId = walletItem?.id;

  const [menuVisible, setMenuVisible] = useState(false);

  const handleDeleteTransactionNEW = async (walletItemId: string) => {
    try {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete and reverse this transaction?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                setLoading(true);

                if (walletItemId?.includes("Bill No")) {
                  // bill amount with penalty (50 + 25 ) - 50 goes to account receiveble. 25 removed from penalty ledger
                  // bank/cash = 75 and member advance = 75
                  // bill item ledger = 50 and bill item ledger receivable = 50
                  // means bill still expected , the amount received is member advanced

                  console.log("Bill-linked entry,", walletItemId);
                  const flatDocRef = doc(db, flatRef);

                  const billDocRef = doc(
                    db,
                    flatRef,
                    customFlatsBillsSubcollectionName,
                    walletItemId
                  );

                  // const mainBillRef = `Societies/${societyName}/${specialBillCollectionName}/${walletItemId}`;
                  const mainBillRef = `Bills/${walletItemId}`;

                  const mainBillDocRef = doc(db, mainBillRef);

                  // const billDoc = await getDoc(billDocRef);
                  // const mainBillDoc = await getDoc(mainBillDocRef);

                  const [flatDocSnap, mainBillDocSnap, flatsBillSnapshot] =
                    await Promise.all([
                      await getDoc(flatDocRef),
                      getDoc(mainBillDocRef),
                      getDoc(billDocRef),
                    ]);

                  if (!flatDocSnap.exists()) {
                    console.error("Flat document does not exist.");
                    return;
                  }

                  if (!mainBillDocSnap.exists()) {
                    console.error("Main bill document does not exist.");
                    return;
                  }

                  if (!flatsBillSnapshot.exists()) {
                    console.error("Flat bill document does not exist.");
                    return;
                  }

                  const flatDetails = flatDocSnap.data();
                  const flatType = flatDetails.flatType;

                  const mainBillData = mainBillDocSnap.data();
                  const billItems = mainBillData?.items || [];

                  const flatBillData = flatsBillSnapshot.data();
                  const receivedBillAmount = flatBillData.receiptAmount;

                  // update bill item ledger
                  for (const item of billItems) {
                    // Update item ledger account. Date is current date when bill is deleted
                    // Update ledger
                    const amountledger =
                      flatType === "Closed"
                        ? item.closedUnitAmount
                        : flatType === "Rent"
                          ? item.rentAmount
                          : item.ownerAmount;
                    const ledgerUpdate1 = await updateLedger(
                      societyName,
                      "Account Receivable",
                      item.updatedLedgerAccount,
                      amountledger,
                      "Add",
                      currentDate
                    );

                    console.log(
                      ` item Ledger Update 1 Status: ${ledgerUpdate1}`
                    );
                  }

                  // Update Penalty if exists, remove from penalty amount ledger account.

                  if (flatBillData.isEnablePenalty) {
                    const penaltyAmount = flatBillData.penaltyAmount;
                    const penaltyLedgerAccount =
                      flatBillData.ledgerAccountPenalty;
                    const penaltyLedgerGroup =
                      flatBillData.ledgerAccountGroupPenalty;
                    const PenaltyLedgerUpdate = await updateLedger(
                      societyName,
                      penaltyLedgerGroup,
                      penaltyLedgerAccount,
                      penaltyAmount,
                      "Subtract",
                      currentDate
                    ); // Update Ledger
                    console.log(
                      ` Penalty Ledger Update Status: ${PenaltyLedgerUpdate}`
                    );
                  }

                  // Since bill is not paid, amount received goes to member advanced
                  const memberAdvancedLedgerUpdate = await updateLedger(
                    societyName,
                    "Current Liabilities",
                    "Members Advanced",
                    receivedBillAmount,
                    "Add",
                    currentDate
                  ); // Update Ledger
                  console.log(memberAdvancedLedgerUpdate);

                  // bill status to be Unpaid
                  const billEntry: any = {
                    status: "unpaid",
                    amount: flatBillData.amount,
                    originalAmount: flatBillData.originalAmount,
                    dueDate: flatBillData.dueDate as string,
                    billType: "Special Bill",
                    startDate: flatBillData.startDate,
                    name: flatBillData.name,
                    isEnablePenalty: flatBillData.isEnablePenalty,
                  };
                  // This will completely replace the document
                  await setDoc(billDocRef, billEntry);

                  if (walletItem?.paymentMode === "Online") {
                    // If bill is paid online by phonepe , then no uncleared balance
                  } else {
                    // bill came from uncleared balance
                  }
                } else {
                  // 1️⃣ Locate the uncleared balance document

                  const unclearedBalanceDocRef = doc(
                    db,
                    flatRef,
                    unclearedBalanceSubcollectionName,
                    walletItemId as string
                  );
                  const unclearedSnap = await getDoc(unclearedBalanceDocRef);

                  if (!unclearedSnap.exists()) {
                    Alert.alert("Error", "Transaction not found for reversal.");
                    return;
                  }

                  const unclearedData = unclearedSnap.data();
                  // const currentBalanceSubcollectionName = `currentBalance_${flatNumber}`;
                  const currentBalanceSubcollectionName = "flatCurrentBalance";
                  const currentbalanceCollectionRef = collection(
                    db,
                    flatRef,
                    currentBalanceSubcollectionName
                  );

                  // const formattedDate = unclearedData.paymentReceivedDate;

                  // 2️⃣  Reverse Members Advance if it was advance receipt. Date is current date when entry is deleted
                  if (unclearedData.origin === "Member entered Advance") {
                    const receiptAmountValue = parseFloat(
                      unclearedData.amountReceived || "0"
                    );

                    // Reverse current balance if previously added
                    await updateFlatCurrentBalance(
                      currentbalanceCollectionRef,
                      receiptAmountValue,
                      "Subtract",
                      currentDate,
                      societyName
                    );

                    // Update Ledger Advance Payment
                    const updatePromises = [];

                    const LedgerUpdate1 = await updateLedger(
                      societyName,
                      unclearedData.ledgerAccountGroup,
                      unclearedData.ledgerAccount,
                      receiptAmountValue,
                      "Subtract",
                      currentDate
                    ); // Update Ledger
                    // console.log(LedgerUpdate1);
                    const LedgerUpdate2 = await updateLedger(
                      societyName,
                      "Current Liabilities",
                      "Members Advanced",
                      receiptAmountValue,
                      "Subtract",
                      currentDate
                    ); // Update Ledger
                    // console.log(LedgerUpdate2);

                    updatePromises.push(LedgerUpdate1, LedgerUpdate2);

                    // Wait for all updates to complete
                    await Promise.all(updatePromises);

                    // Mark uncleared balance as Reversed
                    await updateDoc(unclearedBalanceDocRef, {
                      status: "Reversed",
                      note: `Receipt deleted on ${new Date().toLocaleString()}`,
                      reversedOn: currentDate,
                    });

                    console.log("Reversed Member Advance & Current Balance");
                  } // End if "Member entered Advance"

                  // 3️⃣ Reverse Members Refund if it was advance receipt. Date is current date when entry is deleted

                  if (unclearedData.origin === "Admin entered Refund") {
                    const refundAmountValue = parseFloat(
                      unclearedData.refundAmount || "0"
                    );

                    // Reverse current balance if previously Substracted for refund
                    await updateFlatCurrentBalance(
                      currentbalanceCollectionRef,
                      refundAmountValue,
                      "Add",
                      currentDate,
                      societyName
                    );

                    // Update Ledger Refund Payment

                    const updatePromises = [];

                    const LedgerUpdate1 = await updateLedger(
                      societyName,
                      unclearedData.groupFrom,
                      unclearedData.ledgerAccount,
                      refundAmountValue,
                      "Add",
                      currentDate
                    ); // Update Ledger 1
                    const LedgerUpdate2 = await updateLedger(
                      societyName,
                      "Current Liabilities",
                      "Members Advanced",
                      refundAmountValue,
                      "Add",
                      currentDate
                    ); // Update Ledger 2

                    updatePromises.push(LedgerUpdate1, LedgerUpdate2);

                    // Wait for all updates to complete
                    await Promise.all(updatePromises);

                    // Mark uncleared balance as Reversed
                    await updateDoc(unclearedBalanceDocRef, {
                      status: "Reversed",
                      note: `Receipt deleted on ${new Date().toLocaleString()}`,
                      reversedOn: currentDate,
                    });
                  } // End if "Admin entered Refund"

                  // delete Bill Paid from wallet. set bill to unpaid,
                  // set uncleard balance to "Uncleared", then accept or reject receipt
                } // if (walletItemId?.includes("Bill No"))
              } catch (err) {
                console.error("Error reversing transaction:", err);
                Alert.alert("Error", "Failed to reverse the transaction.");
              } finally {
                setLoading(false);
              }
            }, // End Onpress
          },
        ]
      );
    } catch (error) {
      console.error("Error in handleDelete:", error);
      Alert.alert("Error", "Something went wrong while deleting.");
    }
  };

  /*
  const handleDeleteTransaction = async (
    voucherNumber: string,
    transactionType: "Refund" | "Advance"
  ) => {
    const confirmDeletion = () =>
      new Promise<boolean>((resolve) => {
        Alert.alert(
          "Confirm Deletion",
          `Are you sure you want to delete this ${transactionType}? Changes will be applied to the user wallet.`,
          [
            { text: "No", style: "cancel", onPress: () => resolve(false) },
            { text: "Yes", onPress: () => resolve(true) },
          ],
          { cancelable: true }
        );
      });

    const proceedWithDeletion = async () => {
      try {
        const docRef = doc(db, "Societies", societyName);
        const societyDocSnap = await getDoc(docRef);

        if (!societyDocSnap.exists()) {
          Alert.alert("Error", "Society document not found.");
          return;
        }

        const societyData = societyDocSnap.data();
        const relevantWing =
          societyData?.wings?.[wing]?.floorData?.[floorName]?.[flatNumber];

        if (!relevantWing) {
          Alert.alert("Error", "Flat data not found.");
          return;
        }

        let updatedWingData;
        if (transactionType === "Refund") {
          const refundEntries: RefundEntry[] = relevantWing.Refund || [];
          const refundToDelete = refundEntries.find(
            (entry) => entry.voucherNumber === voucherNumber
          );

          if (!refundToDelete) {
            Alert.alert("Error", "Refund entry not found.");
            return;
          }
          const ledgerAccount = refundToDelete.ledgerAccount;

          // Update balance and refund entries
          relevantWing.currentBalance += refundToDelete.amount;
          relevantWing.Refund = refundEntries.filter(
            (entry) => entry.voucherNumber !== voucherNumber
          );

          updatedWingData = { ...relevantWing };
          // Update ledger

          const updatePromises = [];

          // Group From Remaining

          const LedgerUpdate1 = await updateLedger(
            societyName,
            ledgerAccount,
            refundToDelete.amount,
            "Add",
            currentDate
          ); // Update Ledger
          const LedgerUpdate2 = await updateLedger(
            societyName,
            "Current Liabilities",
            "Members Advanced",
            refundToDelete.amount,
            "Add",
            currentDate
          ); // Update Ledger

          updatePromises.push(LedgerUpdate1, LedgerUpdate2);

          // Wait for all updates to complete
          await Promise.all(updatePromises);
        } else if (transactionType === "Advance") {
          const advanceEntries = relevantWing.Advance || [];
          const entryToDelete = advanceEntries.find(
            (entry) => entry.voucherNumber === voucherNumber
          );

          if (!entryToDelete) {
            Alert.alert("Error", "Advance entry not found.");
            return;
          }

          const { amount: advanceAmount, isDeposit } = entryToDelete;

          // Reverse the balance changes
          if (isDeposit) {
            relevantWing.deposit = (relevantWing.deposit || 0) - advanceAmount;
          } else {
            relevantWing.currentBalance =
              (relevantWing.currentBalance || 0) - advanceAmount;
          }

          // Remove the entry from Advance array
          relevantWing.Advance = advanceEntries.filter(
            (entry) => entry.voucherNumber !== voucherNumber
          );

          updatedWingData = { ...relevantWing };

          // Update ledger

          const updatePromises = [];

          const LedgerUpdate1 = await updateLedger(
            entryToDelete.ledgerAccount,
            entryToDelete.amount,
            "Subtract"
          ); // Update Ledger
          const LedgerUpdate2 = await updateLedger(
            "Members Advanced",
            entryToDelete.amount,
            "Subtract"
          ); // Update Ledger

          updatePromises.push(LedgerUpdate1, LedgerUpdate2);

          // Wait for all updates to complete
          await Promise.all(updatePromises);
        } else {
          Alert.alert("Error", "Invalid transaction type.");
          return;
        }

        // Update Firestore
        await setDoc(docRef, {
          ...societyData,
          wings: {
            ...societyData.wings,
            [wing]: {
              ...societyData.wings[wing],
              floorData: {
                ...societyData.wings[wing].floorData,
                [floorName]: {
                  ...societyData.wings[wing].floorData[floorName],
                  [flatNumber]: updatedWingData,
                },
              },
            },
          },
        });

        Alert.alert("Success", "Refund entry deleted successfully.", [
          {
            text: "OK",
            onPress: () => {
              router.replace({
                pathname: "/member/myBill/Wallet",
                params: {
                  source: "Admin",
                  societyName,
                  wing,
                  floorName,
                  flatNumber,
                },
              });
            },
          },
        ]);
      } catch (error) {
        console.error(
          `Error deleting ${transactionType.toLowerCase()} entry:`,
          error
        );
        Alert.alert(
          "Error",
          `Failed to delete ${transactionType.toLowerCase()} entry. Please try again.`
        );
      }
    };

    const isConfirmed = await confirmDeletion();
    if (isConfirmed) {
      await proceedWithDeletion();
    }
  };

  */

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      {/* Appbar */}
      <Appbar.Header
        style={[
          styles.header,
          { backgroundColor: source === "Admin" ? "#6200ee" : "#2196F3" },
        ]}
      >
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content
          title={walletItem.title}
          titleStyle={styles.titleStyle}
        />
        {source === "Admin" && walletItem.type !== "Paid bill" && (
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
            {walletItem.title === "Add Money" && (
              <Menu.Item onPress={() => {}} title="Edit" />
            )}

            <Menu.Item
              onPress={() => handleDeleteTransactionNEW(walletItemId)}
              title="Delete"
            />
          </Menu>
        )}
      </Appbar.Header>

      {/* Content */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{walletItem.title}</Text>
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={styles.label}>Transaction Id:</Text>
            <Text style={styles.value}>{walletItem.transactionId}</Text>
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={styles.label}>Payment Date:</Text>
            <Text style={styles.value}>{walletItem.dueDate}</Text>
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={styles.label}>Amount:</Text>
            <Text style={styles.value}>
              ₹{(walletItem.amount ?? 0).toFixed(2)}
            </Text>
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={styles.label}>Ledger Account:</Text>
            <Text style={styles.value}>{walletItem.ledgerAccount}</Text>
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={styles.label}>Payment Method:</Text>
            <Text style={styles.value}>{walletItem.paymentMode}</Text>
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={styles.label}>Received By:</Text>
            <Text style={styles.value}>{walletItem.receivedBy ?? "Admin"}</Text>
          </View>
        </Card.Content>
      </Card>
    </View>
  );
};

export default WalletDetails;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: { backgroundColor: "#2196F3" },
  titleStyle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  card: {
    margin: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  label: { fontSize: 16, fontWeight: "bold", color: "#555" },
  value: { fontSize: 16, color: "#333" },
});
