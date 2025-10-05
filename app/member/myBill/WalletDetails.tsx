import { useRouter, useLocalSearchParams } from "expo-router";
import React, {  useState } from "react";
import { View,  StyleSheet, Alert } from "react-native";
import { useSociety } from "@/utils/SocietyContext";
import { Appbar, Card, Text, Divider,  Menu } from "react-native-paper";
import {  doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";

import { updateLedger } from "@/utils/updateLedger";

interface RefundEntry {
  voucherNumber: string;
  amount: number;
  ledgerAccount: string;
}

const WalletDetails = () => {
  const router = useRouter();
  const { source, item } = useLocalSearchParams();
  const societyContext = useSociety();
  const localParams = useLocalSearchParams();

  // Determine params based on source
  const societyName =
    source === "Admin" ? localParams.societyName as string : societyContext.societyName;
  const wing =
    source === "Admin" ? localParams.wing as string : societyContext.wing;
  const flatNumber =
    source === "Admin" ? localParams.flatNumber as string : societyContext.flatNumber;
  const floorName =
    source === "Admin" ? localParams.floorName as string : societyContext.floorName;

  // Parse the passed item
  const walletItem = item ? JSON.parse(item as string) : {};
  // Declare the isDeposit constant
  const isDeposit = walletItem?.isDeposit || false; // Default to false if isDeposit is not present
  const transactionType = walletItem?.type
  const voucherNumber = walletItem?.id
  

  const [menuVisible, setMenuVisible] = useState(false);

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
          const ledgerAccount = refundToDelete.ledgerAccount
  
          // Update balance and refund entries
          relevantWing.currentBalance += refundToDelete.amount;
          relevantWing.Refund = refundEntries.filter(
            (entry) => entry.voucherNumber !== voucherNumber
          );
  
          updatedWingData = { ...relevantWing };
          // Update ledger

          const updatePromises = [];

          const LedgerUpdate1 = await updateLedger(ledgerAccount, refundToDelete.amount, "Add" ); // Update Ledger
          const LedgerUpdate2 = await updateLedger("Members Advanced", refundToDelete.amount, "Add" ); // Update Ledger

          updatePromises.push(
            LedgerUpdate1, LedgerUpdate2
          );

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

          const LedgerUpdate1 = await updateLedger(entryToDelete.ledgerAccount, entryToDelete.amount, "Subtract" ); // Update Ledger
          const LedgerUpdate2 = await updateLedger("Members Advanced", entryToDelete.amount, "Subtract" ); // Update Ledger

          updatePromises.push(
            LedgerUpdate1, LedgerUpdate2
          );

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
        console.error(`Error deleting ${transactionType.toLowerCase()} entry:`, error);
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
  


  
  
  

  return (
    <View style={styles.container}>
      {/* Appbar */}
      <Appbar.Header style={[styles.header, { backgroundColor: source === "Admin" ? "#6200ee" : "#2196F3" },]}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content title={walletItem.title} titleStyle={styles.titleStyle} />
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
            
            <Menu.Item onPress={() =>handleDeleteTransaction(voucherNumber, transactionType)} title="Delete" />
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
            <Text style={styles.value}>₹{walletItem.amount.toFixed(2)}</Text>
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={styles.label}>Ledger Account:</Text>
            <Text style={styles.value}>{walletItem.ledgerAccount}</Text>
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={styles.label}>Payment Method:</Text>
            <Text style={styles.value}>{walletItem.paymentMethod}</Text>
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={styles.label}>Received By:</Text>
            <Text style={styles.value}>{walletItem.receivedBy}</Text>
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
  titleStyle: { color: '#fff', fontSize: 18, fontWeight: 'bold',},
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
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
