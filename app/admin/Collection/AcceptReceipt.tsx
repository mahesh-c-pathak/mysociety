import { StyleSheet, Text, View, Alert } from "react-native";
import React, { useState, useEffect } from "react";
// import { Dropdown } from 'react-native-paper-dropdown';
import { collection, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { Appbar, Button, Switch } from "react-native-paper";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";

import { useSociety } from "../../../utils/SocietyContext";

import { GenerateVoucherNumber } from "../../../utils/generateVoucherNumber";
import { updateLedger } from "../../../utils/updateLedger";
import { getBillItemsLedger } from "../../../utils/getBillItemsLedger";
import { fetchbankCashAccountOptions } from "@/utils/bankCashOptionsFetcher";
import PaymentDatePicker from "@/utils/paymentDate";
import CustomInput from "@/components/CustomInput";

import Dropdown from "@/utils/DropDown";
import { updateFlatCurrentBalance } from "@/utils/updateFlatCurrentBalance"; // Adjust path as needed

const AcceptReceipt = () => {
  const router = useRouter();
  const { societyName } = useSociety();

  const {
    wing,
    floorName,
    flatNumber,
    amount,
    transactionId,
    paymentMode,
    selectedIds,
    bankName,
    chequeNo,
    selectedBillsProperties,
    privateFilePath,
  } = useLocalSearchParams();

  const params = useLocalSearchParams();
  const [receiptAmount, setReceiptAmount] = useState(amount as string);
  const [note, setNote] = useState("");
  const [billSettlement, setBillSettlement] = useState(false);

  const [ledgerAccount, setledgerAccount] = useState<any>("");

  const [accountToOptions, setAccountToOptions] = useState<
    { label: string; value: string; group: string }[]
  >([]);
  const [groupTo, setGroupTo] = useState<string>("");

  const [asOnDate, setAsOnDate] = useState<Date>(new Date());

  const parsedselectedBillsProperties =
    typeof selectedBillsProperties === "string"
      ? JSON.parse(selectedBillsProperties)
      : selectedBillsProperties;

  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;
  const customFlatsBillsSubcollectionName = `${societyName} bills`;

  const unclearedBalanceSubcollectionName = `unclearedBalances_${societyName}`;

  useEffect(() => {
    console.log("parsedselectedBillsProperties", parsedselectedBillsProperties);
  }, [parsedselectedBillsProperties]);

  // fetch Paid To List
  useEffect(() => {
    const fetchbankCashOptions = async () => {
      try {
        const { accountFromOptions } =
          await fetchbankCashAccountOptions(societyName);
        setAccountToOptions(accountFromOptions);
      } catch (error) {
        Alert.alert("Error", "Failed to fetch bank Cash account options.");
      }
    };
    fetchbankCashOptions();
  }, [params?.id]);

  // Payment Date State

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const [paymentDate, setPaymentDate] = useState(
    new Date((params.paymentDate as string) || new Date())
  );
  const [formattedDate, setFormattedDate] = useState(formatDate(paymentDate));

  // Handle Date Picker Change
  const handleDateChange = (newDate: Date) => {
    setAsOnDate(newDate);
    setFormattedDate(formatDate(newDate));
  };

  // save the data
  const handleAccept = async () => {
    try {
      // Check if a ledger account is selected
      if (!ledgerAccount) {
        Alert.alert("Error", "Please select a ledger account.");
        return;
      }

      // Parse and validate receiptAmount
      const receiptAmountValue = parseFloat(receiptAmount as string);
      if (isNaN(receiptAmountValue) || receiptAmountValue <= 0) {
        Alert.alert(
          "Error",
          "Invalid receipt amount. Please enter a valid number."
        );
        return;
      }

      const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
      const flatDocRef = doc(db, flatRef);
      const flatDocSnap = await getDoc(flatDocRef);

      if (!flatDocSnap.exists()) {
        console.warn(`Flat Data Not Exisits.`);
        return;
      }

      const flatDetails = flatDocSnap.data();
      const residentType = flatDetails.resident;

      const billsCollectionRef = collection(
        flatDocRef,
        customFlatsBillsSubcollectionName
      );
      const parsedSelectedIds = selectedIds
        ? JSON.parse(selectedIds as string)
        : [];

      if (Array.isArray(parsedSelectedIds) && parsedSelectedIds.length > 0) {
        let remainingReceiptValue = receiptAmountValue; // Track remaining receiptAmount globally
        const billreceiptVoucherNumber =
          await GenerateVoucherNumber(societyName); // Generate  voucher for bill receipt

        for (const item of parsedSelectedIds) {
          const billDocRef = doc(billsCollectionRef, item);
          const billDoc = await getDoc(billDocRef);

          if (billDoc.exists()) {
            console.log("Bill Document:", billDoc.data());
            const billData = billDoc.data();

            let balanceToApply = Math.min(
              billData.amount,
              remainingReceiptValue
            );
            let totalReceiptAmount = balanceToApply; // Track total receipt amount per bill

            // Check for penalty details if available
            let penaltyUpdate = {};
            const selectedBill = parsedselectedBillsProperties.find(
              (bill: any) => bill.id === item
            );

            if (selectedBill) {
              penaltyUpdate = {
                overdueDays: selectedBill.overdueDays,
                penaltyAmount: selectedBill.penaltyAmount,
                ledgerAccountPenalty: selectedBill.ledgerAccountPenalty,
                ledgerAccountGroupPenalty:
                  selectedBill.ledgerAccountGroupPenalty,
              };

              // Deduct penalty amount from remaining receipt value
              remainingReceiptValue -= selectedBill.penaltyAmount;

              // Include penaltyAmount in total receiptAmount
              totalReceiptAmount += selectedBill.penaltyAmount;

              const ledgerUpdate = await updateLedger(
                societyName,
                selectedBill.ledgerAccountGroupPenalty,
                selectedBill.ledgerAccountPenalty,
                selectedBill.penaltyAmount,
                "Add",
                formattedDate
              );
              console.log(` Penalty Ledger Update Status: ${ledgerUpdate}`);
            }

            // Ensure remainingReceiptValue is not negative
            remainingReceiptValue = Math.max(remainingReceiptValue, 0);

            // Deduct from bill amount
            balanceToApply = Math.min(billData.amount, remainingReceiptValue);
            billData.amount -= balanceToApply;
            remainingReceiptValue -= balanceToApply;

            // Update bill status
            const billStatus = billData.amount === 0 ? "paid" : "unpaid";

            // Update the document
            await updateDoc(billDocRef, {
              status: billStatus,
              receiptAmount: totalReceiptAmount, // Include penalty amount
              paymentDate: formattedDate, // Save formatted date
              paymentMode: paymentMode || "Other", // Add payment mode
              bankName: bankName || null, // Include bank name if applicable
              chequeNo: chequeNo || null, // Include cheque number if applicable
              transactionId,
              voucherNumber: billreceiptVoucherNumber,
              type: "Bill Paid",
              origin: "Bill Settelment",
              note,
              paidledgerAccount: ledgerAccount,
              paidledgerGroup: groupTo,

              ...penaltyUpdate, // Only adds penalty fields if available
              privateFilePath,
            });

            console.log(`Updated bill document with ID: ${item}`);
            // Mahesh Entered

            // Call the function to get bill details
            const billItemLedger = await getBillItemsLedger(
              societyName,
              item,
              residentType
            );

            // Process each item: log details and update ledger
            for (const { updatedLedgerAccount, amount } of billItemLedger) {
              // Update ledger
              const ledgerUpdate = await updateLedger(
                societyName,
                "Account Receivable",
                updatedLedgerAccount,
                amount,
                "Subtract",
                formattedDate
              );
              console.log(
                ` Account Receivable Ledger Update Status: ${ledgerUpdate}`
              );
            }

            // Mahesh
          } else {
            console.log(`Bill document with ID: ${item} does not exist`);
          }
        }

        // If all bills are cleared, update uncleared balance status to "Cleared"
        if (remainingReceiptValue === 0) {
          const unclearedBalanceDocRef = doc(
            db,
            flatRef,
            unclearedBalanceSubcollectionName,
            transactionId as string
          );
          const docSnap = await getDoc(unclearedBalanceDocRef);

          if (docSnap.exists()) {
            await updateDoc(unclearedBalanceDocRef, {
              status: "Cleared",
              amountReceived: receiptAmountValue,
              paymentReceivedDate: formattedDate, // Save formatted date,
              ledgerAccount,
              ledgerAccountGroup: groupTo,
              note,
              voucherNumber: billreceiptVoucherNumber,
              type: "Bill Paid",
              origin: "Bill Settelment",
            });
            console.log(
              `Uncleared balance with ID: ${transactionId} updated to 'Cleared'`
            );
          } else {
            console.log(
              `Uncleared balance document with ID: ${transactionId} does not exist`
            );
          }
        }

        const LedgerUpdate = await updateLedger(
          societyName,
          groupTo,
          ledgerAccount,
          parseFloat(receiptAmount as string),
          "Add",
          formattedDate
        ); // Update Ledger

        console.log("Bill Receipt Final ledger update ", LedgerUpdate);
        Alert.alert("Success", "Receipt processed successfully.");
        router.replace({
          pathname: "/admin/Collection/FlatCollectionSummary",
          params: {
            wing: wing,
            floorName: floorName,
            flatNumber: flatNumber,
          },
        });
      } else {
        console.log(
          "No selected IDs or logic unchanged. parsedSelectedIds length is 0"
        );
        // Existing logic for current balance without updating bills
        const receiptValue = parseFloat(receiptAmount as string);
        if (!isNaN(receiptValue)) {
          const memberAdvanceVoucherNumber =
            await GenerateVoucherNumber(societyName); // Generate separate voucher for receipt
          // Update  advance entry
          const unclearedBalanceDocRef = doc(
            db,
            flatRef,
            unclearedBalanceSubcollectionName,
            transactionId as string
          );
          const docSnap = await getDoc(unclearedBalanceDocRef);

          if (docSnap.exists()) {
            await updateDoc(unclearedBalanceDocRef, {
              status: "Cleared",
              amountReceived: receiptValue,
              paymentReceivedDate: formattedDate, // Save formatted date,
              ledgerAccount,
              note,
              voucherNumber: memberAdvanceVoucherNumber,
              isDeposit: false,
              origin: "Member entered Advance",
              type: "Advance",
              ledgerAccountGroup: groupTo,
            });
          }

          // Logic to save Advance Entry and Update Current Balance for the Flat

          try {
            const currentBalanceSubcollectionName = `currentBalance_${flatNumber}`;
            const currentbalanceCollectionRef = collection(
              db,
              flatRef,
              currentBalanceSubcollectionName
            );

            const result = await updateFlatCurrentBalance(
              currentbalanceCollectionRef,
              parseFloat(receiptAmount as string),
              "Add",
              formattedDate
            );

            console.log("Balance update result:", result);
          } catch (error) {
            console.error("Failed to update balance:", error);
          }

          // Update Ledger
          const LedgerUpdate = await updateLedger(
            societyName,
            groupTo,
            ledgerAccount,
            parseFloat(receiptAmount as string),
            "Add",
            formattedDate
          ); // Update Ledger
          console.log(LedgerUpdate);
          const LedgerUpdate2 = await updateLedger(
            societyName,
            "Current Liabilities",
            "Members Advanced",
            parseFloat(amount as string),
            "Add",
            formattedDate
          ); // Update Ledger
          console.log(LedgerUpdate2);
        } else {
          console.error(
            "Invalid receiptAmount, unable to update currentBalance."
          );
          return;
        }
        Alert.alert("Success", "Receipt processed successfully.");
        router.replace({
          pathname: "/admin/Collection/FlatCollectionSummary",
          params: {
            wing: wing,
            floorName: floorName,
            flatNumber: flatNumber,
          },
        });
      }
    } catch (error) {
      console.error("Error in handleAccept:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Remove Stack Header */}
      <Stack.Screen options={{ headerShown: false }} />
      {/* Appbar Header */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Accept Receipt" />
      </Appbar.Header>

      <View style={styles.modalContainer}>
        {/* Receipt Amount */}
        <View style={{ width: "100%" }}>
          <CustomInput
            label="Receipt Amount"
            value={receiptAmount}
            onChangeText={setReceiptAmount}
            keyboardType="numeric"
          />
        </View>

        {/* Ledger Account */}
        <View style={styles.section}>
          <Text style={styles.label}>Ledger Account</Text>
          <Dropdown
            data={accountToOptions.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            onChange={(selectedValue) => {
              setledgerAccount(selectedValue);

              // Find the selected account to get its group
              const selectedOption = accountToOptions.find(
                (option) => option.value === selectedValue
              );
              if (selectedOption) {
                setGroupTo(selectedOption.group); // Set the group name
              }
            }}
            placeholder="Select Account"
            initialValue={ledgerAccount}
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

        {/* Note */}
        <View style={{ width: "100%" }}>
          <CustomInput
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            multiline={true}
          />
        </View>

        {/* Bill Settlement */}
        <View style={styles.switchContainer}>
          <Text>Bill Settlement</Text>
          <Switch
            value={billSettlement}
            onValueChange={() => setBillSettlement(!billSettlement)}
            color="#4CAF50"
          />
        </View>

        {/* Accept Button */}
        <Button
          mode="contained"
          style={styles.modalAcceptButton}
          onPress={() => handleAccept()}
        >
          Accept
        </Button>
      </View>
    </View>
  );
};

export default AcceptReceipt;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { backgroundColor: "#2196F3" },
  section: { marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 4,
    padding: 10,
    marginVertical: 8,
  },
  modalContainer: {
    backgroundColor: "#FFF",
    width: "90%",
    borderRadius: 8,
    padding: 16,
  },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  dateInput: { flex: 1, borderBottomWidth: 1, paddingVertical: 8 },
  calendarIcon: { fontSize: 20, marginLeft: 8 },
  noteInput: { height: 80, textAlignVertical: "top" },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  modalAcceptButton: { backgroundColor: "#4CAF50", marginTop: 10 },
});
