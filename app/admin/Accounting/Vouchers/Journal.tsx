import { db } from "@/firebaseConfig";
import { useLedgerEffect } from "@/utils/getLedgerEffect";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection, doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { ActivityIndicator, Appbar } from "react-native-paper";

import { updateLedger } from "@/utils/updateLedger";

import { journalFromToGroupList } from "@/components/LedgerGroupList"; // Import the array
import { fetchAccountList } from "@/utils/acountFetcher";
import { GenerateVoucherNumber } from "@/utils/generateVoucherNumber";

import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import Dropdown from "@/utils/DropDown";
import PaymentDatePicker from "@/utils/paymentDate";

import { useSociety } from "@/utils/SocietyContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { globalStyles } from "@/styles/globalStyles";

const Journal: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { societyName } = useSociety();
  // const transactionCollectionName = `Transactions_${societyName}`;
  const { getLedgerEffect } = useLedgerEffect();
  const bankCashCategories = ["Bank Accounts", "Cash in Hand"];

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

  const [accountFromOptions, setAccountFromOptions] = useState<
    { label: string; value: string; group: string }[]
  >([]);
  const [accountToOptions, setAccountToOptions] = useState<
    { label: string; value: string; group: string }[]
  >([]);

  const [asOnDate, setAsOnDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // const [expenseOptions, setExpenseOptions] = useState<string[]>([]);

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
          const transactionRef = doc(db, "Transactions", params.id as string);
          const transactionDoc = await getDoc(transactionRef);

          if (transactionDoc.exists()) {
            const transactionData = transactionDoc.data();
            setPaidFrom(transactionData.paidFrom || "");
            setPaidTo(transactionData.paidTo || "");
            setGroupFrom(transactionData.groupFrom);
            setGroupTo(transactionData.groupTo);
            setNarration(transactionData.narration || "");
            setAmount(
              transactionData.amount ? transactionData.amount.toString() : ""
            );
            setCustomVoucher(transactionData.customVoucher || "");
            setPaymentNote(transactionData.paymentNote || "");
            setAsOnDate(
              transactionData.transactionDate
                ? new Date(transactionData.transactionDate)
                : new Date()
            );
            setFormattedDate(
              formatDate(
                transactionData.transactionDate
                  ? new Date(transactionData.transactionDate)
                  : new Date()
              )
            );
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
  }, [params.id, societyName]);

  // fetch Paid From To List
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const { accountOptions } = await fetchAccountList(
          societyName,
          journalFromToGroupList
        );
        setAccountFromOptions(accountOptions);
        setAccountToOptions(accountOptions);
      } catch (error) {
        console.log("error", error);
        Alert.alert("Error", "Failed to fetch account options.");
      }
    };
    fetchOptions();
  }, [params.id, societyName]);

  const invertEffect = (effect: "Add" | "Subtract"): "Add" | "Subtract" =>
    effect === "Add" ? "Subtract" : "Add";

  const handleSave = async () => {
    if (!paidFrom || !paidTo || !amount) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    if (paidFrom === paidTo) {
      Alert.alert(
        "Error",
        "The values for 'Account From' and 'Account To' cannot be the same."
      );
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
        societyName: string;
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
        societyName, // 🔥 required
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

      // Apply new ledger updates
      const isCreditForFrom = bankCashCategories.includes(groupFrom)
        ? false
        : true;
      const isCreditForTo = bankCashCategories.includes(groupTo) ? true : false;

      if (isEditMode && params?.id) {
        // Update existing transaction
        const transactionRef = doc(db, "Transactions", params.id as string);
        const transactionDoc = await getDoc(transactionRef);
        if (!transactionDoc.exists()) {
          Alert.alert("Error", "Transaction not found.");
          return;
        }
        const originalTransaction = transactionDoc.data();
        const originalPaidFrom = originalTransaction.paidFrom;
        const originalPaidTo = originalTransaction.paidTo;
        const originalGroupFrom = originalTransaction.groupFrom;
        const originalGroupTo = originalTransaction.groupTo;
        const originalAmount = parseFloat(originalTransaction.amount);

        // Update the transaction in Firestore
        await updateDoc(transactionRef, transaction);

        // Revert original ledger updates
        const isCreditForFromRevert = bankCashCategories.includes(
          originalGroupFrom
        )
          ? false
          : true;
        const isCreditForToRevert = bankCashCategories.includes(originalGroupTo)
          ? true
          : false;

        await updateLedger(
          societyName,
          originalGroupFrom,
          originalPaidFrom,
          originalAmount,
          invertEffect(
            getLedgerEffect(originalGroupFrom, isCreditForFromRevert)
          ), // Debit side revert
          formattedDate
        );
        await updateLedger(
          societyName,
          originalGroupTo,
          originalPaidTo,
          originalAmount,
          invertEffect(getLedgerEffect(originalGroupTo, isCreditForToRevert)), // Credit side revert,,
          formattedDate
        );

        console.log("Debit Effect:", getLedgerEffect(groupFrom, true));
        console.log("Credit Effect:", getLedgerEffect(groupTo, false));

        // Apply new ledger updates
        await updateLedger(
          societyName,
          groupFrom,
          paidFrom,
          parsedAmount,
          getLedgerEffect(groupFrom, isCreditForFrom), // Debit side "Subtract",
          formattedDate
        );
        await updateLedger(
          societyName,
          groupTo,
          paidTo,
          parsedAmount,
          getLedgerEffect(groupTo, isCreditForTo), // Credit side "Add",
          formattedDate
        );

        Alert.alert("Success", "Transaction updated successfully!", [
          {
            text: "OK",
            onPress: () =>
              router.replace("/admin/Accounting/TransactionScreen"),
          },
        ]);
      } else {
        // Generate voucher number and create new transaction
        const voucher = await GenerateVoucherNumber(societyName);
        transaction.voucher = voucher;

        await addDoc(collection(db, "Transactions"), transaction);

        console.log("Debit Effect:", getLedgerEffect(groupFrom, true));
        console.log("Credit Effect:", getLedgerEffect(groupTo, false));

        // Update ledger
        await updateLedger(
          societyName,
          groupFrom,
          paidFrom,
          parsedAmount,
          getLedgerEffect(groupFrom, isCreditForFrom), // Debit side "Subtract",
          formattedDate
        );
        await updateLedger(
          societyName,
          groupTo,
          paidTo,
          parsedAmount,
          getLedgerEffect(groupTo, isCreditForTo), // Credit side "Add",
          formattedDate
        );

        Alert.alert("Success", "Transaction saved successfully!", [
          {
            text: "OK",
            onPress: () =>
              router.replace("/admin/Accounting/TransactionScreen"),
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
      <View style={globalStyles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      {/* Top Appbar */}
      <Appbar.Header style={globalStyles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content title="Journal" titleStyle={globalStyles.titleStyle} />
      </Appbar.Header>

      <FlatList
        data={[{}]} // Use a single-item list to render your UI
        renderItem={() => (
          <>
            <View style={globalStyles.cardview}>
              {/* Paid From */}
              <View style={globalStyles.section}>
                <Text style={globalStyles.label}>Paid From</Text>
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
              <View style={globalStyles.section}>
                <Text style={globalStyles.label}>Paid To</Text>
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
              <View style={{ width: "100%" }}>
                <CustomInput
                  label="Narration"
                  value={narration}
                  onChangeText={setNarration}
                  multiline={true}
                />
              </View>
            </View>

            <View style={globalStyles.cardview}>
              {/* Amount */}
              <View style={{ width: "100%" }}>
                <CustomInput
                  label="Amount"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
              </View>

              {/* Custom Voucher No */}
              <View style={{ width: "100%" }}>
                <CustomInput
                  label="Custom Voucher No. (optional)"
                  value={customVoucher}
                  onChangeText={setCustomVoucher}
                />
              </View>

              {/* Note */}
              <View style={{ width: "100%" }}>
                <CustomInput
                  label="Payment Note"
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                  multiline={true}
                />
              </View>

              {/* Transaction Date */}
              <View style={globalStyles.section}>
                <Text style={globalStyles.label}>Transaction Date</Text>
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
          globalStyles.scrollContainer,
          { paddingBottom: insets.bottom + 100 }, // 👈 extra space for footer + FAB
        ]}
      />
      {/* Save Button */}
      <View style={[globalStyles.footer, { bottom: insets.bottom }]}>
        <CustomButton
          onPress={handleSave}
          title={isEditMode ? "Update" : "Save"}
        />
      </View>
    </View>
  );
};

export default Journal;
