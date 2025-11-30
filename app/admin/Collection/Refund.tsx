import { StyleSheet, View, ScrollView, TextInput, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Appbar, Button, Text, Avatar } from "react-native-paper";
import { db } from "@/firebaseConfig";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";

import { useSociety } from "@/utils/SocietyContext";
import { GenerateVoucherNumber } from "@/utils/generateVoucherNumber";
import { updateLedger } from "@/utils/updateLedger";
import Dropdown from "@/utils/DropDown";
import { fetchbankCashAccountOptions } from "@/utils/bankCashOptionsFetcher";
import PaymentDatePicker from "@/utils/paymentDate";
import { generateTransactionId } from "@/utils/generateTransactionId";
import { updateFlatCurrentBalance } from "@/utils/updateFlatCurrentBalance";
import paymentModeOptions from "@/utils/paymentModeOptions";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Refund = () => {
  const router = useRouter();
  const { societyName } = useSociety();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams();
  const wing = params.wing as string;
  const floorName = params.floorName as string;
  const flatNumber = params.flatNumber as string;
  const currentBalance = parseFloat(params.currentBalance as string);

  // State to manage editable amount and note input
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [ledgerAccount, setLedgerAccount] = useState<any>("");
  const [accountFromOptions, setAccountFromOptions] = useState<
    { label: string; value: string; group: string }[]
  >([]);
  const [groupFrom, setGroupFrom] = useState<string>("");

  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;
  // const unclearedBalanceSubcollectionName = `unclearedBalances_${societyName}`;

  const unclearedBalanceSubcollectionName = "unclearedBalances";

  const [paymentMode, setpaymentMode] = useState<string>("");
  const [showPaymentMode, setShowPaymentMode] = useState<boolean>(false);
  const [bankAccountOptions, setBankAccountOptions] = useState<
    { label: string; value: string; group: string }[]
  >([]);

  // 🧾 State for Cheque Inputs
  const [bankName, setBankName] = useState("");
  const [chequeNo, setChequeNo] = useState("");

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
  // Handle Date Picker Change
  const handleDateChange = (newDate: Date) => {
    setPaymentDate(newDate);
    setFormattedDate(formatDate(newDate));
  };

  // fetch Paid from List
  useEffect(() => {
    const fetchbankCashOptions = async () => {
      try {
        const { accountFromOptions, bankAccountOptions } =
          await fetchbankCashAccountOptions(societyName);
        setAccountFromOptions(accountFromOptions);
        setBankAccountOptions(bankAccountOptions);
      } catch (err) {
        const error = err as Error; // Explicitly cast 'err' to 'Error'
        Alert.alert(
          "Error",
          error.message || "Failed to fetch bank Cash account options."
        );
      }
    };

    fetchbankCashOptions();
  }, [params.id, societyName]);

  useEffect(() => {
    if (bankAccountOptions.some((option) => option.group === groupFrom)) {
      setShowPaymentMode(true);
    } else {
      setShowPaymentMode(false);
      setpaymentMode("Cash");
    }
  }, [bankAccountOptions, groupFrom, ledgerAccount]);

  const handleSave = async () => {
    try {
      if (!ledgerAccount || !amount) {
        Alert.alert(
          "Error",
          "Please enter an amount and select a ledger account."
        );
        return;
      }
      const refundAmount = parseFloat(amount);
      const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
      const flatDocRef = doc(db, flatRef);
      if (currentBalance >= refundAmount) {
        try {
          // const currentBalanceSubcollectionName = `currentBalance_${flatNumber}`;
          const currentBalanceSubcollectionName = "flatCurrentBalance";
          const currentbalanceCollectionRef = collection(
            db,
            flatRef,
            currentBalanceSubcollectionName
          );

          const result = await updateFlatCurrentBalance(
            currentbalanceCollectionRef,
            refundAmount,
            "Subtract",
            formattedDate,
            societyName
          );

          console.log("Flat current Balance update result:", result);
        } catch (error) {
          console.error("Failed to update Flat Current balance:", error);
        }
      } else {
        Alert.alert("Refund", "User don't have enough balance");
        return;
      }

      // Update  Refund entry
      const unclearedBalanceRef = collection(
        flatDocRef,
        unclearedBalanceSubcollectionName
      );
      let transactionId = generateTransactionId();
      // Keep generating a new transactionId if it already exists
      let docRef = doc(unclearedBalanceRef, transactionId);
      let docSnap = await getDoc(docRef);

      while (docSnap.exists()) {
        transactionId = generateTransactionId(); // Generate a new ID
        docRef = doc(unclearedBalanceRef, transactionId); // Update docRef
        docSnap = await getDoc(docRef); // Check again
      }

      const voucherNumber = await GenerateVoucherNumber(societyName);

      // Create a new advance entry
      const newAdvanceEntry = {
        societyName: societyName,
        status: "Cleared",
        amount: refundAmount,
        amountReceived: refundAmount,
        paymentReceivedDate: formattedDate, // Save formatted date,
        paymentDate,
        ledgerAccount,
        paymentMode,
        note,
        voucherNumber,
        type: "Refund",
        origin: "Admin entered Refund",
        ledgerAccountGroup: groupFrom,
        bankName,
        chequeNo,
      };

      // Set the document once we have a unique transactionId
      await setDoc(docRef, newAdvanceEntry);
      console.log("Uncleared Balance Document created successfully.");

      // Update Ledger

      const updatePromises = [];

      const LedgerUpdate1 = await updateLedger(
        societyName,
        groupFrom,
        ledgerAccount,
        refundAmount,
        "Subtract",
        formattedDate
      ); // Update Ledger
      const LedgerUpdate2 = await updateLedger(
        societyName,
        "Current Liabilities",
        "Members Advanced",
        refundAmount,
        "Subtract",
        formattedDate
      ); // Update Ledger

      updatePromises.push(LedgerUpdate1, LedgerUpdate2);

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      Alert.alert(
        "Refund",
        "Refund entry added successfully",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate to FlatCollectionSummary route
              router.replace({
                pathname: "/admin/Collection/FlatCollectionSummary",
                params: {
                  wing: wing,
                  floorName: floorName,
                  flatNumber: flatNumber,
                },
              });
            },
          },
        ],
        { cancelable: false } // Ensure user cannot dismiss the alert without pressing OK
      );
    } catch (err) {
      const error = err as Error; // Explicitly cast 'err' to 'Error'
      Alert.alert(
        "Error",
        error.message || "Failed to save payment. Please try again."
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Remove Stack Header */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Appbar Header */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content title="Refund" titleStyle={styles.titleStyle} />
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

      <ScrollView style={styles.formContainer}>
        <Text style={styles.redlabel}>
          Refund option is only available for users who already has advance
          balance
        </Text>

        {/* Amount Input */}
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount.toString()}
          keyboardType="numeric"
          onChangeText={(text) => setAmount(text)}
        />

        {/* Note Input */}
        <Text style={styles.label}>Note</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={note}
          placeholder="Enter a note (optional)"
          onChangeText={(text) => setNote(text)}
          multiline
        />

        {/* Ledger Account */}
        <View style={styles.section}>
          <Text style={styles.label}>Ledger Account</Text>
          <Dropdown
            data={accountFromOptions.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            onChange={(selectedValue) => {
              setLedgerAccount(selectedValue);

              // Find the selected account to get its group
              const selectedOption = accountFromOptions.find(
                (option) => option.value === selectedValue
              );
              if (selectedOption) {
                setGroupFrom(selectedOption.group); // Set the group name
              }
            }}
            placeholder="Select Account"
            initialValue={ledgerAccount}
          />
        </View>

        {/* Payment Mode */}
        {showPaymentMode && (
          <View style={styles.section}>
            <Text style={styles.label}>Payment Mode</Text>
            <Dropdown
              data={paymentModeOptions}
              onChange={setpaymentMode}
              placeholder="Select Payment Mode"
            />
          </View>
        )}

        {paymentMode === "Cheque" && (
          <>
            <Text style={styles.label}>Bank Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Bank Name"
              value={bankName}
              onChangeText={setBankName}
            />

            <Text style={styles.label}>Cheque No.</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Cheque Number"
              keyboardType="numeric"
              value={chequeNo}
              onChangeText={setChequeNo}
            />
          </>
        )}

        {/* Payment Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Payment Date</Text>
          <PaymentDatePicker
            initialDate={paymentDate}
            onDateChange={handleDateChange}
          />
        </View>
      </ScrollView>

      {/* Accept Button */}
      <Button
        mode="contained"
        style={[styles.saveButton, { bottom: insets.bottom }]}
        onPress={() => handleSave()}
      >
        Save
      </Button>
    </View>
  );
};

export default Refund;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { backgroundColor: "#6200ee" },
  titleStyle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    backgroundColor: "#6200ee",
    paddingBottom: 10,
  },
  profileText: { fontSize: 14, color: "white" },
  textContainer: { justifyContent: "center" },
  avatar: {
    backgroundColor: "#6200ee",
    marginRight: 10,
    borderColor: "#fff",
    borderWidth: 2,
  },
  formContainer: { padding: 16 },
  redlabel: { fontSize: 14, marginBottom: 16, color: "red" },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  noteInput: { height: 80, textAlignVertical: "top" },
  section: {
    marginBottom: 16, // Adds consistent spacing between sections
  },
  saveButton: {
    backgroundColor: "#6200ee",
    marginTop: 10,
    marginHorizontal: 20,
  },
});
