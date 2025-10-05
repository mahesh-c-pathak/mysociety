import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Appbar, Button, Text, Avatar, Switch } from "react-native-paper";
import Dropdown from "@/utils/DropDown";
import {
  collection,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { useSociety } from "@/utils/SocietyContext";
import { db } from "@/firebaseConfig";
import PaymentDatePicker from "@/utils/paymentDate";
import { GenerateVoucherNumber } from "@/utils/generateVoucherNumber";
import { updateLedger } from "@/utils/updateLedger";
import paymentModeOptions from "@/utils/paymentModeOptions";
import { fetchbankCashAccountOptions } from "@/utils/bankCashOptionsFetcher";
import { generateTransactionId } from "@/utils/generateTransactionId";
import { updateFlatCurrentBalance } from "@/utils/updateFlatCurrentBalance";

const Advance = () => {
  const router = useRouter();
  const { societyName } = useSociety();
  const params = useLocalSearchParams();

  const wing = params.wing as string;
  const floorName = params.floorName as string;
  const flatNumber = params.flatNumber as string;

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [ledgerAccount, setLedgerAccount] = useState<any>("");
  const [accountFromOptions, setAccountFromOptions] = useState<
    { label: string; value: string; group: string }[]
  >([]);
  const [groupFrom, setGroupFrom] = useState<string>("");

  const [paymentDate, setPaymentDate] = useState(
    new Date((params.paymentDate as string) || Date.now())
  );

  const [isDeposit, setIsDeposit] = useState(false);

  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;

  const unclearedBalanceSubcollectionName = `unclearedBalances_${societyName}`;

  const [paymentMode, setpaymentMode] = useState<string>("");
  const [showPaymentMode, setShowPaymentMode] = useState<boolean>(false);
  const [bankAccountOptions, setBankAccountOptions] = useState<
    { label: string; value: string; group: string }[]
  >([]);

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const [formattedDate, setFormattedDate] = useState(formatDate(paymentDate));

  // Handle Date Picker Change
  const handleDateChange = (newDate: Date) => {
    setPaymentDate(newDate);
    setFormattedDate(formatDate(newDate));
  };

  useEffect(() => {
    setFormattedDate(formatDate(paymentDate));
  }, [paymentDate]);

  // fetch Paid from List
  useEffect(() => {
    const fetchbankCashOptions = async () => {
      try {
        const { accountFromOptions, bankAccountOptions } =
          await fetchbankCashAccountOptions(societyName);
        setAccountFromOptions(accountFromOptions);
        setBankAccountOptions(bankAccountOptions);
      } catch (error) {
        Alert.alert("Error", "Failed to fetch bank Cash account options.");
      }
    };

    fetchbankCashOptions();
  }, [params?.id]);

  useEffect(() => {
    if (bankAccountOptions.some((option) => option.group === groupFrom)) {
      setShowPaymentMode(true);
    } else {
      setShowPaymentMode(false);
      setpaymentMode("Cash");
    }
  }, [bankAccountOptions, ledgerAccount]);

  const handleSave = async () => {
    try {
      if (!ledgerAccount || !amount) {
        Alert.alert(
          "Error",
          "Please enter an amount and select a ledger account."
        );
        return;
      }

      // Update  advance entry
      const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
      const flatDocRef = doc(db, flatRef);
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
      const advanceAmount = parseFloat(amount);

      // Create a new advance entry
      const newAdvanceEntry = {
        status: "Cleared",
        amount: advanceAmount,
        amountReceived: advanceAmount,
        paymentReceivedDate: formattedDate, // Save formatted date,
        paymentDate,
        ledgerAccount,
        note,
        voucherNumber,
        isDeposit,
        paymentMode,
        type: "Advance",
        origin: "Admin entered Advance",
        ledgerAccountGroup: groupFrom,
      };

      // Set the document once we have a unique transactionId
      await setDoc(docRef, newAdvanceEntry);
      console.log("Uncleared Balance Document created successfully.");

      // Update deposit or current balance based on `isDeposit`
      if (isDeposit) {
        // relevantWing.deposit = (relevantWing.deposit || 0) + advanceAmount;
        try {
          const depositSubcollectionName = `deposit_${flatNumber}`;
          const depositCollectionRef = collection(
            db,
            flatRef,
            depositSubcollectionName
          );
          const result = await updateFlatCurrentBalance(
            depositCollectionRef,
            advanceAmount,
            "Add",
            formattedDate
          );
          console.log("Deposit update result:", result);
        } catch (error) {
          console.error("Failed to update Flat Deposit balance:", error);
        }
      } else {
        // relevantWing.currentBalance = (relevantWing.currentBalance || 0) + advanceAmount;
        try {
          const currentBalanceSubcollectionName = `currentBalance_${flatNumber}`;
          const currentbalanceCollectionRef = collection(
            db,
            flatRef,
            currentBalanceSubcollectionName
          );

          const result = await updateFlatCurrentBalance(
            currentbalanceCollectionRef,
            advanceAmount,
            "Add",
            formattedDate
          );

          console.log("Balance update result:", result);
        } catch (error) {
          console.error("Failed to update Flat Current balance:", error);
        }
      }
      // Update Ledger
      const updatePromises = [];

      const LedgerUpdate1 = await updateLedger(
        societyName,
        groupFrom,
        ledgerAccount,
        parseFloat(amount as string),
        "Add",
        formattedDate
      ); // Update Ledger
      const LedgerUpdate2 = await updateLedger(
        societyName,
        "Current Liabilities",
        "Members Advanced",
        parseFloat(amount as string),
        "Add",
        formattedDate
      ); // Update Ledger

      updatePromises.push(LedgerUpdate1, LedgerUpdate2);

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      Alert.alert("Success", "Advance entry saved successfully.", [
        {
          text: "OK",
          onPress: () =>
            router.replace({
              pathname: "/admin/Collection/FlatCollectionSummary",
              params: { wing, floorName, flatNumber },
            }),
        },
      ]);
    } catch (error) {
      console.error("Error in handleSave:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content title="Advance" titleStyle={styles.titleStyle} />
      </Appbar.Header>
      <View style={styles.profileContainer}>
        <Avatar.Text size={44} label="XD" style={styles.avatar} />
        <View style={styles.textContainer}>
          <Text style={styles.profileText}>{`${wing} ${flatNumber}`}</Text>
        </View>
      </View>
      <ScrollView style={styles.formContainer}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          keyboardType="numeric"
          onChangeText={setAmount}
        />
        <Text style={styles.label}>Note</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={note}
          placeholder="Enter a note (optional)"
          onChangeText={setNote}
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

        {/* Transaction Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Payment Date</Text>
          <PaymentDatePicker
            initialDate={paymentDate}
            onDateChange={handleDateChange}
          />
        </View>

        {/* switch - for Deposit */}
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Is this deposit?</Text>
          <Switch
            value={isDeposit}
            onValueChange={() => setIsDeposit(!isDeposit)}
            color="#4CAF50"
          />
        </View>
        <Text style={styles.redlabel}>
          Deposit amount will not be used for bill settlement
        </Text>
      </ScrollView>

      <Button
        mode="contained"
        style={styles.saveButton}
        onPress={() => handleSave()}
      >
        Save
      </Button>
    </View>
  );
};

export default Advance;

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
  section: { marginBottom: 16 },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  saveButton: {
    backgroundColor: "#6200ee",
    marginTop: 10,
    marginHorizontal: 20,
  },
});
