import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Appbar, Menu, Text, Button, Divider, ActivityIndicator } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";

import { updateLedger } from "../../../utils/updateLedger";
import { useSociety } from "../../../utils/SocietyContext";

const TransactionDetailScreen = () => {
  const { societyName } = useSociety();
  const transactionCollectionName = `Transactions_${societyName}`;
  const router = useRouter();
  const { id, type, voucher, transactionDate, paidFrom, paidTo, amount, narration, groupFrom, groupTo } = useLocalSearchParams();
  const {  liabilityAccounts} = useSociety();
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [loading, setLoading] = useState(false);

  // Handle deleting the transaction
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
              if (typeof id === "string") {
                await deleteDoc(doc(db, "Societies", societyName, transactionCollectionName, id));

                if (type === "Expense" || type === "Receipt" || type === "Purchase") {
                  // Update ledger                            
                  // Revert original ledger updates
                  await updateLedger(
                    societyName,
                    groupTo as string,
                    paidTo as string,
                    parseFloat(amount as string),
                    liabilityAccounts.includes(paidTo as string) ? "Add" : "Subtract",
                    transactionDate as string
                  );
                  await updateLedger(
                    societyName,
                    groupFrom as string,
                    paidFrom as string,
                    parseFloat(amount as string),
                    liabilityAccounts.includes(paidFrom as string) ? "Subtract" : "Add",
                    transactionDate as string
                  );
               }
 
                if (type === "Income") {
                  // Update ledger                            
                 const updatePromises = [];        
                 const LedgerUpdate1 = await updateLedger(societyName, groupFrom as string, paidFrom as string, parseFloat(amount as string), "Subtract",transactionDate as string ); // Update Ledger
                 const LedgerUpdate2 = await updateLedger(societyName, groupTo as string, paidTo as string, parseFloat(amount as string), "Subtract", transactionDate as string ); // Update Ledger       
                 updatePromises.push(
                   LedgerUpdate1, LedgerUpdate2
                 );
                 // Wait for all updates to complete
                 await Promise.all(updatePromises);
               }

           if (type === "Cash-Withdrawal"|| type === "Cash-Deposit" || type === "Journal" || "Cash-To-Cash-Transfer" || "Bank-To-Bank-Transfer") {
            // Update ledger                            
           const updatePromises = [];        
           const LedgerUpdate1 = await updateLedger(societyName, groupFrom as string, paidFrom as string, parseFloat(amount as string), "Add" , transactionDate as string); // Update Ledger
           const LedgerUpdate2 = await updateLedger(societyName, groupTo as string, paidTo as string, parseFloat(amount as string), "Subtract", transactionDate as string ); // Update Ledger       
           updatePromises.push(
             LedgerUpdate1, LedgerUpdate2
           );
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
                pathname: `/${type}`,
                params: { id, type, voucher, transactionDate, paidFrom, paidTo, amount, narration },
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
          <Text style={styles.label}>Amount: </Text>
          ₹ {Number(amount).toFixed(2)}
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
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center",},
  content: { padding: 16 },
  detailItem: { marginVertical: 8, fontSize: 16 },
  label: { fontWeight: "bold" },
  divider: { marginVertical: 8 },
  downloadButton: { marginHorizontal: 16, marginTop: 16 },
});

export default TransactionDetailScreen;
