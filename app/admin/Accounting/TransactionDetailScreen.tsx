import { db } from "@/firebaseConfig";
import { useLocalSearchParams, useRouter } from "expo-router";
import { deleteDoc, doc } from "firebase/firestore";
import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Divider,
  Menu,
  Text,
} from "react-native-paper";

import { useLedgerEffect } from "@/utils/getLedgerEffect";
import { useSociety } from "../../../utils/SocietyContext";
import { updateLedger } from "../../../utils/updateLedger";

const TransactionDetailScreen = () => {
  const { societyName } = useSociety();
  const router = useRouter();
  const {
    id,
    type,
    voucher,
    transactionDate,
    paidFrom,
    paidTo,
    amount,
    narration,
    groupFrom,
    groupTo,
  } = useLocalSearchParams();
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [loading, setLoading] = useState(false);
  // const transactionCollectionNam = `Transactions_${societyName}`;

  const { getLedgerEffect } = useLedgerEffect();

  const invertEffect = (effect: "Add" | "Subtract"): "Add" | "Subtract" =>
    effect === "Add" ? "Subtract" : "Add";

  const handleDelete = async () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              if (typeof id !== "string") {
                Alert.alert("Error", "Invalid transaction ID.");
                return;
              }

              // Delete transaction from Firestore
              await deleteDoc(doc(db, "Transactions", id));

              const parsedAmount = parseFloat(amount as string);

              let ledgerEffectgroupFrom: "Add" | "Subtract" = "Add";
              let ledgerEffectgroupTo: "Add" | "Subtract" = "Add";

              // Credit side revert for receipt check Receipt screen
              const bankCashCategories = ["Bank Accounts", "Cash in Hand"];

              const isCreditForFrom = bankCashCategories.includes(
                groupFrom as string
              )
                ? false
                : true;
              const isCreditForTo = bankCashCategories.includes(
                groupTo as string
              )
                ? true
                : false;

              ledgerEffectgroupTo = invertEffect(
                getLedgerEffect(groupTo as string, isCreditForTo)
              );

              // Debit side revert;
              ledgerEffectgroupFrom = invertEffect(
                getLedgerEffect(groupFrom as string, isCreditForFrom)
              );

              // 🧠 Use the same logic as Journal: revert both sides using inverted effects
              await updateLedger(
                societyName,
                groupFrom as string,
                paidFrom as string,
                parsedAmount,
                ledgerEffectgroupFrom, // invertEffect(getLedgerEffect(groupFrom as string, false)), // Debit side revert
                transactionDate as string
              );

              await updateLedger(
                societyName,
                groupTo as string,
                paidTo as string,
                parsedAmount,
                ledgerEffectgroupTo, // invertEffect(getLedgerEffect(groupTo as string, true)), // Credit side revert
                transactionDate as string
              );

              Alert.alert("Deleted", "The transaction has been deleted.");
              router.replace("/admin/Accounting/TransactionScreen");
            } catch (error) {
              console.error("Error deleting transaction:", error);
              Alert.alert("Error", "Could not delete the transaction.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  {
    /* 

  // Handle deleting the transaction
  const handleDelete_old = async () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              if (typeof id === "string") {
                await deleteDoc(
                  doc(
                    db,
                    "Societies",
                    societyName,
                    transactionCollectionName,
                    id
                  )
                );

                if (
                  type === "Expense" ||
                  type === "Receipt" ||
                  type === "Purchase"
                ) {
                  // Update ledger
                  // Revert original ledger updates
                  await updateLedger(
                    societyName,
                    groupTo as string,
                    paidTo as string,
                    parseFloat(amount as string),
                    liabilityAccounts.includes(paidTo as string)
                      ? "Add"
                      : "Subtract",
                    transactionDate as string
                  );
                  await updateLedger(
                    societyName,
                    groupFrom as string,
                    paidFrom as string,
                    parseFloat(amount as string),
                    liabilityAccounts.includes(paidFrom as string)
                      ? "Subtract"
                      : "Add",
                    transactionDate as string
                  );
                }

                if (type === "Income") {
                  // Update ledger
                  const updatePromises = [];
                  const LedgerUpdate1 = await updateLedger(
                    societyName,
                    groupFrom as string,
                    paidFrom as string,
                    parseFloat(amount as string),
                    "Subtract",
                    transactionDate as string
                  ); // Update Ledger
                  const LedgerUpdate2 = await updateLedger(
                    societyName,
                    groupTo as string,
                    paidTo as string,
                    parseFloat(amount as string),
                    "Subtract",
                    transactionDate as string
                  ); // Update Ledger
                  updatePromises.push(LedgerUpdate1, LedgerUpdate2);
                  // Wait for all updates to complete
                  await Promise.all(updatePromises);
                }

                if (
                  type === "Cash-Withdrawal" ||
                  type === "Cash-Deposit" ||
                  type === "Journal" ||
                  "Cash-To-Cash-Transfer" ||
                  "Bank-To-Bank-Transfer"
                ) {
                  // Update ledger
                  const updatePromises = [];
                  const LedgerUpdate1 = await updateLedger(
                    societyName,
                    groupFrom as string,
                    paidFrom as string,
                    parseFloat(amount as string),
                    "Add",
                    transactionDate as string
                  ); // Update Ledger
                  const LedgerUpdate2 = await updateLedger(
                    societyName,
                    groupTo as string,
                    paidTo as string,
                    parseFloat(amount as string),
                    "Subtract",
                    transactionDate as string
                  ); // Update Ledger
                  updatePromises.push(LedgerUpdate1, LedgerUpdate2);
                  // Wait for all updates to complete
                  await Promise.all(updatePromises);
                }

                Alert.alert("Deleted", "The transaction has been deleted.");
                router.replace("/admin/Accounting/TransactionScreen"); // Go back to the transactions list
              } else {
                console.error("Invalid ID type:", id);
                Alert.alert("Error", "Invalid transaction ID.");
              }
            } catch (error) {
              console.error("Error deleting transaction:", error);
              Alert.alert("Error", "Could not delete the transaction.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  */
  }

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={`${type} - ${voucher}`} />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="dots-vertical"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            leadingIcon="pencil"
            title="Edit"
            onPress={() => {
              setMenuVisible(false);
              router.push({
                pathname: `/admin/Accounting/Vouchers/${type}` as any,
                params: {
                  id,
                  type,
                  voucher,
                  transactionDate,
                  paidFrom,
                  paidTo,
                  amount,
                  narration,
                },
              });
            }}
          />
          <Menu.Item
            leadingIcon="delete"
            title="Delete"
            onPress={() => {
              setMenuVisible(false);
              handleDelete();
            }}
          />
        </Menu>
      </Appbar.Header>

      {/* Transaction Details */}
      <View style={styles.content}>
        <Text style={styles.detailItem}>
          <Text style={styles.label}>Transaction Date: </Text>
          {transactionDate}
        </Text>
        <Divider style={styles.divider} />
        <Text style={styles.detailItem}>
          <Text style={styles.label}>Paid From (-): </Text>
          {paidFrom}
        </Text>
        <Divider style={styles.divider} />
        <Text style={styles.detailItem}>
          <Text style={styles.label}>Paid To (+): </Text>
          {paidTo}
        </Text>
        <Divider style={styles.divider} />
        <Text style={styles.detailItem}>
          <Text style={styles.label}>Amount: </Text>₹{" "}
          {Number(amount).toFixed(2)}
        </Text>
        <Divider style={styles.divider} />
        <Text style={styles.detailItem}>
          <Text style={styles.label}>Narration: </Text>
          {narration}
        </Text>
      </View>

      {/* Download Voucher Button */}
      <Button
        mode="contained"
        style={styles.downloadButton}
        onPress={() => console.log("Download Voucher")}
      >
        Download Voucher
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16 },
  detailItem: { marginVertical: 8, fontSize: 16 },
  label: { fontWeight: "bold" },
  divider: { marginVertical: 8 },
  downloadButton: { marginHorizontal: 16, marginTop: 16 },
});

export default TransactionDetailScreen;
