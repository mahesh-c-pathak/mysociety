import React, { useState, useEffect } from "react";
import {  StyleSheet, Alert, Text, View, FlatList } from "react-native";
import { Appbar, ActivityIndicator } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { updateLedger } from "../../../../utils/updateLedger";
import { useSociety } from "../../../../utils/SocietyContext";
import { GenerateVoucherNumber } from "../../../../utils/generateVoucherNumber";
import { receiptFromToGroupsList } from '../../../../components/LedgerGroupList'; // Import the array
import { fetchAccountList } from "../../../../utils/acountFetcher";
import CustomButton from '../../../../components/CustomButton';
import CustomInput from '../../../../components/CustomInput';
import Dropdown from "../../../../utils/DropDown";
import PaymentDatePicker from "../../../../utils/paymentDate";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ReceiptScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { societyName } = useSociety();
  const transactionCollectionName = `Transactions_${societyName}`;
  const router = useRouter();
  const params = useLocalSearchParams();
  const isEditMode = !!params?.id;
  const {  liabilityAccounts  } = useSociety();

  const [paidFrom, setPaidFrom] = useState<string>("");
  const [paidTo, setPaidTo] = useState<string>("");

  const [groupFrom, setGroupFrom] = useState<string>("");
  const [groupTo, setGroupTo] = useState<string>("");

  const [narration, setNarration] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [customVoucher, setCustomVoucher] = useState<string>("");
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [asOnDate, setAsOnDate] = useState<Date>(new Date());

  const [loading, setLoading] = useState(false);
    
  const [accountFromOptions, setAccountFromOptions] = useState<{ label: string; value: string; group: string }[]>([]);
  const [accountToOptions, setAccountToOptions] = useState<{ label: string; value: string; group: string }[]>([]);

  // useEffect(() => {console.log('liabilityAccounts', liabilityAccounts)}, [liabilityAccounts]);
  // Function to format date as "YYYY-MM-DD"
    const formatDate = (date: Date) => {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${year}-${month}-${day}`;
    };
  
    const [formattedDate, setFormattedDate] = useState(formatDate(new Date()));
  
    const handleDateChange = (newDate: Date) => {
      setAsOnDate(newDate);
      setFormattedDate(formatDate(newDate));
    };

    // fetch Paid From and Paid To List
    useEffect(() => {
      const fetchOptions = async () => {
        try {
          const { accountOptions } = await fetchAccountList(societyName, receiptFromToGroupsList);
          setAccountFromOptions(accountOptions);
          setAccountToOptions(accountOptions);
        } catch (error) {
          Alert.alert("Error", "Failed to fetch account options.");
        }
      };
  
      fetchOptions();
    }, [receiptFromToGroupsList, params?.id]);

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      if (isEditMode && params?.id) {
        try {
          const docRef = doc(db, "Societies", societyName, transactionCollectionName, params.id as string);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setPaidFrom(data.paidFrom || "");
            setPaidTo(data.paidTo || "");
            setNarration(data.narration || "");
            setAmount(data.amount ? data.amount.toString() : "");
            setCustomVoucher(data.customVoucher || "");
            setPaymentNote(data.paymentNote || "");
            setAsOnDate(new Date(data.transactionDate || new Date()));
            setFormattedDate(
              data.transactionDate ? data.transactionDate : formatDate(new Date())
            );
            setGroupFrom(data.groupFrom);
            setGroupTo(data.groupTo);
          }
        } catch (error) {
          console.error("Error fetching transaction details:", error);
          Alert.alert("Error", "Failed to fetch transaction details.");
        }
      }
    };

    fetchTransactionDetails();
  }, [isEditMode, params?.id]);

  const handleSave = async () => {
    if (!paidFrom || !paidTo || !amount) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        Alert.alert("Error", "Please enter a valid amount.");
        return;
      }

      const transaction: {
        paidFrom: string;
        paidTo: string;
        groupFrom: string;
        groupTo: string;
        narration: string;
        amount: number;
        customVoucher: string | null;
        paymentNote: string | null;
        transactionDateTime: string;
        transactionDate: string;
        createdAt: string;
        type: string;
        voucher?: string;
      } = {
        paidFrom,
        paidTo,
        groupFrom,
        groupTo,
        narration,
        amount: parsedAmount,
        customVoucher: customVoucher || null,
        paymentNote: paymentNote || null,
        transactionDateTime: asOnDate.toISOString(),
        transactionDate: formattedDate,
        createdAt: new Date().toISOString(),
        type: "Receipt",
      };
  
      if (isEditMode && params?.id) {
        // Update existing transaction
        const transactionRef = doc(db, "Societies", societyName, transactionCollectionName, params.id as string);
        const transactionDoc = await getDoc(transactionRef);
        if (!transactionDoc.exists()) {
          Alert.alert("Error", "Transaction not found.");
          return;
        }
        const originalTransaction = transactionDoc.data();
        const originalPaidFrom = originalTransaction.paidFrom
        const originalPaidTo = originalTransaction.paidTo;
        const originalAmount = parseFloat(originalTransaction.amount);
        const originalGroupFrom = originalTransaction.groupFrom;
        const originalGroupTo = originalTransaction.groupTo;
        const originalTransactionDate = originalTransaction.transactionDate;

        // Update the transaction in Firestore
        await updateDoc(transactionRef, transaction);

        // Ledger updates based on changes
        // Revert original ledger updates
        await updateLedger(
          societyName,
          originalGroupTo,
          originalPaidTo,
          originalAmount,
          liabilityAccounts.includes(originalPaidTo) ? "Add" : "Subtract",
          originalTransactionDate
        );
        await updateLedger(
          societyName,
          originalGroupFrom,
          originalPaidFrom,
          originalAmount,
          liabilityAccounts.includes(originalPaidFrom) ? "Subtract" : "Add",
          originalTransactionDate
        );

        // Apply new ledger updates
          await updateLedger(
            societyName,
            groupTo,
            paidTo,
            parsedAmount,
            liabilityAccounts.includes(paidTo) ? "Subtract" : "Add",
            formattedDate
          );
          await updateLedger(
            societyName,
            groupFrom,
            paidFrom,
            parsedAmount,
            liabilityAccounts.includes(paidFrom) ? "Add" : "Subtract",
            formattedDate
          );
       
  
        // Show success alert and navigate to TransactionScreen
        Alert.alert("Success", "Transaction updated successfully!", [
          {
            text: "OK",
            onPress: () => router.replace("/admin/Accounting/TransactionScreen"),
          },
        ]);
      } else {
        // Add new transaction
        // Generate voucher number and create new transaction
        const voucher = await GenerateVoucherNumber(societyName);
        transaction.voucher = voucher;
        await addDoc(collection(db, "Societies", societyName, transactionCollectionName), transaction);

        // Update ledger
        await updateLedger(
          societyName,
          groupTo,
          paidTo,
          parsedAmount,
          liabilityAccounts.includes(paidTo) ? "Subtract" : "Add",
          formattedDate
        );
        await updateLedger(
          societyName,
          groupFrom,
          paidFrom, 
          parsedAmount,
          liabilityAccounts.includes(paidFrom) ? "Add" : "Subtract",
          formattedDate
        );
  
        // Show success alert and navigate to TransactionScreen
        Alert.alert("Success", "Transaction saved successfully!", [
          {
            text: "OK",
            onPress: () => router.replace("/admin/Accounting/TransactionScreen"),
          },
        ]);
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
      Alert.alert("Error", "Failed to save transaction.");
    } finally {
      setLoading(false);
    }
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
      {/* Top Appbar */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content title="Receipt" titleStyle={styles.titleStyle} />
      </Appbar.Header>
      <FlatList
              data={[{}]} // Use a single-item list to render your UI
              renderItem={() => (
                <>
                    <View style={styles.cardview}>
      
                      {/* Paid From */}
                      <View style={styles.section}>
                        <Text style={styles.label}>Paid From</Text>
                        <Dropdown
                          data={accountFromOptions.map((option) => ({
                            label: option.label,
                            value: option.value,
                          }))}
                          onChange={(selectedValue) => {
                            setPaidFrom(selectedValue);
        
                            // Find the selected account to get its group
                            const selectedOption = accountFromOptions.find(
                              (option) => option.value === selectedValue
                            );
                            if (selectedOption) {
                              setGroupFrom(selectedOption.group); // Set the group name
                            }
                          }}
                          placeholder="Select Account"
                          initialValue={paidFrom}
                        />
        
                      </View>
                       {/* Paid To */}
                      <View style={styles.section}>
                        <Text style={styles.label}>Paid To</Text>
                        <Dropdown
                          data={accountToOptions.map((option) => ({
                            label: option.label,
                            value: option.value,
                          }))}
                          onChange={(selectedValue) => {
                            setPaidTo(selectedValue);
        
                            // Find the selected account to get its group
                            const selectedOption = accountToOptions.find(
                              (option) => option.value === selectedValue
                            );
                            if (selectedOption) {
                              setGroupTo(selectedOption.group); // Set the group name
                            }
                          }}
                          placeholder="Select Account"
                          initialValue={paidTo}
                        />
                      </View>

        
                      {/* Narration */}
                      <View style={{ width: '100%' }}>
                              <CustomInput
                                label="Narration"
                                value={narration}
                                onChangeText={setNarration}
                                multiline = {true}
                              />
                            </View>
                    </View>

                    <View style={styles.cardview}>

                      {/* Amount */}
                      <View style={{ width: '100%' }}>
                              <CustomInput
                                label="Amount"
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                              />
                            </View>
                      {/* Note */}
                      <View style={{ width: '100%' }}>
                              <CustomInput
                                label="Payment Note"
                                value={paymentNote}
                                onChangeText={setPaymentNote}
                                multiline = {true}
                              />
                            </View>
                      {/* Transaction Date */}
                      <View style={styles.section}>
                              <Text style={styles.label}>Transaction Date</Text>
                              <PaymentDatePicker
                                initialDate={asOnDate}
                                onDateChange={handleDateChange}
                              />
                            </View>
                    
                    </View>
                    </>
                  )}
                  keyExtractor={(item, index) => index.toString()}
                  contentContainerStyle={[
    styles.scrollContainer,
    { paddingBottom: insets.bottom + 100 }, // 👈 extra space for footer + FAB
  ]}
                />

                {/* Save Button */}
                <View
        style={[
          styles.footer,
          { bottom: insets.bottom },
        ]}
      >
              <CustomButton
                onPress={handleSave}
                title= {isEditMode ? "Update" : "Save"}
              />
              </View>
    </View>
  );
};

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
  
  section: { marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  cardview: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    elevation: 4, // For shadow on Android
    shadowColor: "#000", // For shadow on iOS
    shadowOffset: { width: 0, height: 2 }, // For shadow on iOS
    shadowOpacity: 0.1, // For shadow on iOS
    shadowRadius: 4, // For shadow on iOS
    borderWidth: 1, // Optional for outline
    borderColor: "#e0e0e0", // Optional for outline
  },
  scrollContainer: { padding: 16 },
  header: { backgroundColor: "#6200ee" },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  footer: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,   // 👈 ensures it's always visible at bottom
    backgroundColor: "#fff",
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
});

export default ReceiptScreen;
