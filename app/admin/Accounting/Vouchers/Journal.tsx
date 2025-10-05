import React, { useState, useEffect } from "react";
import {  StyleSheet, Alert,  View, FlatList, Text } from "react-native";
import {  Appbar, ActivityIndicator } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { collection, doc, getDoc, getDocs, query, where, addDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";

import { updateLedger } from "../../../../utils/updateLedger";

import { GenerateVoucherNumber } from "../../../../utils/generateVoucherNumber";
import { journalFromToGroupList } from '../../../../components/LedgerGroupList'; // Import the array
import { fetchAccountList } from "../../../../utils/acountFetcher";

import CustomButton from '../../../../components/CustomButton';
import CustomInput from '../../../../components/CustomInput';
import Dropdown from "../../../../utils/DropDown";
import PaymentDatePicker from "../../../../utils/paymentDate";

import { useSociety } from "@/utils/SocietyContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Journal: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { societyName } = useSociety();
  const transactionCollectionName = `Transactions_${societyName}`;

  const router = useRouter();
  const params = useLocalSearchParams(); // Extract parameters like `id`

  const [paidFrom, setPaidFrom] = useState<string>("");
  const [paidTo, setPaidTo] = useState<string>("");

  const [groupFrom, setGroupFrom] = useState<string>("");
  const [groupTo, setGroupTo] = useState<string>("");

  const [narration, setNarration] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [customVoucher, setCustomVoucher] = useState<string>("");
  const [paymentNote, setPaymentNote] = useState<string>("");
 
  const [accountFromOptions, setAccountFromOptions] = useState<{ label: string; value: string; group: string }[]>([]);
  const [accountToOptions, setAccountToOptions] = useState<{ label: string; value: string; group: string }[]>([]);

  const [asOnDate, setAsOnDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const [expenseOptions, setExpenseOptions] = useState<string[]>([]);

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



  useEffect(() => {
    const fetchTransactionDetails = async () => {
      if (params?.id) {
        setIsEditMode(true);
        try {
          const transactionRef = doc(db, "Societies", societyName, transactionCollectionName, params.id as string);
          const transactionDoc = await getDoc(transactionRef);

          if (transactionDoc.exists()) {
            const transactionData = transactionDoc.data();
            setPaidFrom(transactionData.paidFrom || "");
            setPaidTo(transactionData.paidTo || "");
            setGroupFrom(transactionData.groupFrom);
            setGroupTo(transactionData.groupTo);
            setNarration(transactionData.narration || "");
            setAmount(transactionData.amount ? transactionData.amount.toString() : "");
            setCustomVoucher(transactionData.customVoucher || "");
            setPaymentNote(transactionData.paymentNote || "");
            setAsOnDate(transactionData.transactionDate ? new Date(transactionData.transactionDate) : new Date());
            setFormattedDate(formatDate(
              transactionData.transactionDate ? new Date(transactionData.transactionDate) : new Date()
            ));
          } else {
            Alert.alert("Error", "Transaction not found.");
          }
        } catch (error) {
          console.error("Error fetching transaction details:", error);
          Alert.alert("Error", "Failed to fetch transaction details.");
        }
      }
    };
    fetchTransactionDetails();
  }, [params?.id]);

      // fetch Paid From To List
      useEffect(() => {
        const fetchOptions = async () => {
          try {
            const { accountOptions } = await fetchAccountList(societyName,journalFromToGroupList);
            setAccountFromOptions(accountOptions);
            setAccountToOptions(accountOptions);
          } catch (error) {
            Alert.alert("Error", "Failed to fetch account options.");
          }
        };
        fetchOptions();
      }, [journalFromToGroupList, params?.id]);

  useEffect(() => {
    const fetchExpenseOptions = async () => {
          try {
              const ledgerGroupsRef = collection(db, "Societies", societyName, transactionCollectionName);
      
              const expenseQuerySnapshot = await getDocs(
                query(ledgerGroupsRef, where("name", "in", ["Direct Expenses", "Indirect Expenses"]))
              );
              const expenseAccounts = expenseQuerySnapshot.docs
                .map((doc) => doc.data().accounts || [])
                .flat()
                .filter((account) => account.trim() !== "");
                setExpenseOptions(expenseAccounts);
              } catch (error) {
                      console.error("Error fetching account options:", error);
                      Alert.alert("Error", "Failed to fetch account options.");
                    }
            };
            fetchExpenseOptions();
  }, []);



  const handleSave = async () => {
    if (!paidFrom || !paidTo || !amount) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    if (paidFrom === paidTo) {
      Alert.alert("Error", "The values for 'Account From' and 'Account To' cannot be the same.");
      return;
    }
    setLoading(true);
    try {
      // Parse amount as a number
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        Alert.alert("Error", "Please enter a valid amount.");
        return;
      }
  
      // Create the transaction object
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
        type: "Journal",
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

        // Update the transaction in Firestore
        await updateDoc(transactionRef, transaction);

        // Revert original ledger updates
        await updateLedger(societyName, groupFrom, originalPaidFrom, originalAmount, "Add", formattedDate);
        await updateLedger(societyName, groupTo,originalPaidTo, originalAmount, "Subtract", formattedDate);

        // Apply new ledger updates
        await updateLedger(societyName,groupFrom, paidFrom, parsedAmount, "Subtract", formattedDate);
        await updateLedger(societyName, groupTo, paidTo, parsedAmount, "Add", formattedDate);

        Alert.alert("Success", "Transaction updated successfully!", [
            {
                text: "OK",
                onPress: () => router.replace("/admin/Accounting/TransactionScreen"),
            },
        ]);
    } else {
        // Generate voucher number and create new transaction
        const voucher = await GenerateVoucherNumber(societyName);
        transaction.voucher = voucher;

        await addDoc(collection(db, "Societies", societyName, transactionCollectionName), transaction);

        // Update ledger            
        await updateLedger(societyName,groupFrom, paidFrom, parsedAmount, "Subtract", formattedDate);
        await updateLedger(societyName,groupTo, paidTo, parsedAmount, "Add", formattedDate);

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
            <Appbar.Content title="Journal" titleStyle={styles.titleStyle} />
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
    
                  {/* Custom Voucher No */}
                  <View style={{ width: '100%' }}>
                    <CustomInput
                      label="Custom Voucher No. (optional)"
                      value={customVoucher}
                      onChangeText={setCustomVoucher}
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
      scrollContainer: { padding: 16 },
      header: { backgroundColor: "#6200ee" },
      titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
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


export default Journal