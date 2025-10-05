import React, { useState } from "react";
import { View, StyleSheet, TextInput, Alert } from "react-native";
import { Appbar, Button, Text } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";

const MakePayments = () => {
  const router = useRouter();
  const {
    totalAmount,
    selectedIds,
    totalDue,
    currentBalance,
    unclearedBalance,
    selectedBills,
    flatRef,
    societyName,
  } = useLocalSearchParams();

  // Ensure these are strings
  const formattedtotalAmount = String(totalAmount);
  const formattedtotalDue = String(totalDue);
  const formattedcurrentBalance = String(currentBalance);
  const formattedunclearedBalance = String(unclearedBalance);

  // State to manage editable amount and note input
  const [amount, setAmount] = useState(
    totalAmount ? parseFloat(formattedtotalAmount) : 0
  );
  const [note, setNote] = useState("");

  return (
    <View style={styles.container}>
      {/* Appbar */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Make Payment" />
      </Appbar.Header>

      {/* Balance Summary */}
      <View style={styles.balanceContainer}>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceTitle}>Total Due</Text>
          <Text style={styles.balanceValue}>
            ₹ {parseFloat(formattedtotalDue).toFixed(2)}
          </Text>
        </View>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceTitle}>Current Balance</Text>
          <Text style={styles.balanceValue}>
            ₹ {parseFloat(formattedcurrentBalance).toFixed(2)}
          </Text>
        </View>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceTitle}>Uncleared Balance</Text>
          <Text style={styles.balanceValue}>
            ₹ {parseFloat(formattedunclearedBalance).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Payment Form */}
      <View style={styles.formContainer}>
        {/* Amount Input */}
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount.toString()}
          keyboardType="numeric"
          onChangeText={(text) => setAmount(parseFloat(text) || 0)}
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
      </View>

      {/* Make Payment Button */}
      <Button
        mode="contained"
        style={styles.button}
        onPress={() => {
          // Add payment processing logic here
          if (amount <= 0) {
            Alert.alert(
              "Invalid Amount",
              "Please enter an amount. Amount cannot be zero."
            );
            return;
          }

          // Proceed if amount is valid
          router.push({
            pathname: "/member/myBill/SelectPaymentMode",
            params: {
              amountPayable: amount.toFixed(2),
              selectedIds,
              selectedBills,
              flatRef,
              societyName,
            },
          });
        }}
      >
        Make Payment
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { backgroundColor: "#2196F3" },
  balanceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#E3F2FD",
  },
  balanceItem: { alignItems: "center" },
  balanceTitle: { color: "#666", fontSize: 12 },
  balanceValue: { color: "#2196F3", fontWeight: "bold", fontSize: 16 },
  formContainer: { padding: 16 },
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
  button: { marginHorizontal: 16, backgroundColor: "#2196F3", marginTop: 10 },
});

export default MakePayments;
