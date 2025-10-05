import React, { useState, useEffect } from "react";
import { View, Text, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { db } from "@/firebaseConfig";
import { doc, getDoc, collection, updateDoc } from "firebase/firestore";
import { GenerateVoucherNumber } from "@/utils/generateVoucherNumber";
import { updateLedger } from "../../../utils/updateLedger";
import { getBillItemsLedger } from "../../../utils/getBillItemsLedger";
import { updateFlatCurrentBalance } from "@/utils/updateFlatCurrentBalance"; // Adjust path as needed
import { generateTransactionId } from "@/utils/generateTransactionId";
import { sendEmailNew } from "@/utils/sendEmailNew";
import { sendPushNotification } from "@/utils/sendPushNotification";

export default function Success() {
  const {
    selectedIds,
    selectedBills,
    flatRef,
    societyName,
    merchantTransactionId,
  } = useLocalSearchParams();

  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [isPaymentSuccessful, setIsPaymentSuccessful] = useState<
    boolean | null
  >(null);

  const [receiptAmountValue, setReceiptAmountValue] = useState<number | null>(
    null
  );

  const [ledgerAccount, setledgerAccount] = useState<any>("Bank");
  const [groupTo, setGroupTo] = useState<string>("Bank Accounts");

  const customFlatsBillsSubcollectionName = `${societyName} bills`;
  const unclearedBalanceSubcollectionName = `unclearedBalances_${societyName}`;

  const extractFlatDetails = (flatRef: string) => {
    const parts = flatRef.split("/");

    return {
      wing: parts[3] || "",
      floorName: parts[5] || "",
      flatNumber: parts[7] || "",
    };
  };

  // Example usage
  const { wing, floorName, flatNumber } = extractFlatDetails(flatRef as string);

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const [formattedDate, setFormattedDate] = useState(formatDate(new Date()));

  // Ensure we have a string before parsing
  const parsedIds = Array.isArray(selectedIds)
    ? JSON.parse(selectedIds[0])
    : selectedIds
      ? JSON.parse(selectedIds)
      : [];

  const parsedBills = Array.isArray(selectedBills)
    ? JSON.parse(selectedBills[0])
    : selectedBills
      ? JSON.parse(selectedBills)
      : [];

  useEffect(() => {
    console.log("societyName:", societyName);
    console.log("selectedIds:", parsedIds);
    console.log("selectedBills:", parsedBills);
    console.log("flatRef:", flatRef);
    console.log("merchantTransactionId:", merchantTransactionId);

    const verifyPayment = async () => {
      try {
        if (!societyName) return;

        const paymentRef = doc(
          db,
          "Societies",
          societyName as string,
          `phonePePayments_${societyName}`,
          merchantTransactionId as string
        );
        const snap = await getDoc(paymentRef);

        if (snap.exists()) {
          const data = snap.data();
          console.log("Payment JSON from Firestore:", data);

          if (
            data.code === "PAYMENT_SUCCESS" &&
            data.data?.state === "COMPLETED"
          ) {
            console.log("✅ Successful");
            setIsPaymentSuccessful(true);
            setReceiptAmountValue(data.data?.amount / 100);
          } else {
            console.log("❌ Not successful");
            setIsPaymentSuccessful(false);
          }
        }
      } catch (err) {
        console.error("Error verifying payment:", err);
      }
    };

    verifyPayment();
  }, [societyName]);

  useEffect(() => {
    const clearBillAndUpdateLedger = async () => {
      try {
        if (!isPaymentSuccessful || !receiptAmountValue) return; // ✅ only run if payment succeeded
        // Parse and validate receiptAmount
        console.log("receiptAmountValue:", receiptAmountValue);
        setLoading(true);
        const flatDocRef = doc(db, flatRef as string);
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

        let transactionId = generateTransactionId();

        let processedBills: any[] = []; // ✅ collect bills for notification/email later

        // ---------------------------
        // Case 1: Paying against bills
        // ---------------------------

        if (Array.isArray(parsedSelectedIds) && parsedSelectedIds.length > 0) {
          let remainingReceiptValue = receiptAmountValue as number; // Track remaining receiptAmount globally
          const billreceiptVoucherNumber = await GenerateVoucherNumber(
            societyName as string
          ); // Generate  voucher for bill receipt

          for (const item of parsedSelectedIds) {
            const billDocRef = doc(billsCollectionRef, item);
            const billDoc = await getDoc(billDocRef);

            if (billDoc.exists()) {
              console.log("Bill Document:", billDoc.data());
              const billData = billDoc.data();
              const billAmount = billData.amount;
              let balanceToApply = Math.min(
                billData.amount,
                remainingReceiptValue
              );
              let totalReceiptAmount = balanceToApply; // Track total receipt amount per bill

              // Check for penalty details if available
              let penaltyUpdate = {};
              const selectedBill = parsedBills.find(
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
                  societyName as string,
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
                paymentMode: "Online", // Add payment mode
                transactionId,
                voucherNumber: billreceiptVoucherNumber,
                type: "Bill Paid",
                origin: "Bill Settelment",
                paidledgerAccount: "Bank", // verify mahesh
                paidledgerGroup: "Bank Accounts", // verify mahesh

                ...penaltyUpdate, // Only adds penalty fields if available
              });

              // ✅ collect bill info for notification/email
              processedBills.push({
                title: billData.name || "Bill",
                amountToPay: totalReceiptAmount,
                id: item,
              });

              console.log(`Updated bill document with ID: ${item}`);
              // Mahesh Entered

              // Call the function to get bill details
              const billItemLedger = await getBillItemsLedger(
                societyName as string,
                item,
                residentType
              );

              // Process each item: log details and update ledger
              for (const {
                updatedLedgerAccount,
                ledgerAccount,
                groupFrom,
                amount,
                invoiceDate,
              } of billItemLedger) {
                // Update ledger
                const ledgerUpdate = await updateLedger(
                  societyName as string,
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

          const LedgerUpdate = await updateLedger(
            societyName as string,
            groupTo,
            ledgerAccount,
            receiptAmountValue as number, //parseFloat(receiptAmount as string),
            "Add",
            formattedDate
          ); // Update Ledger

          console.log("Bill Receipt Final ledger update ", LedgerUpdate);
        } else {
          // ---------------------------
          // Case 2: Advance payment
          // ---------------------------
          console.log(
            "No selected IDs or logic unchanged. parsedSelectedIds length is 0"
          );
          // Existing logic for current balance without updating bills
          const receiptValue = receiptAmountValue as number;
          if (!isNaN(receiptValue)) {
            const memberAdvanceVoucherNumber = await GenerateVoucherNumber(
              societyName as string
            ); // Generate separate voucher for receipt
            // Update  advance entry
            const unclearedBalanceDocRef = doc(
              db,
              flatRef as string,
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
                flatRef as string,
                currentBalanceSubcollectionName
              );

              const result = await updateFlatCurrentBalance(
                currentbalanceCollectionRef,
                receiptAmountValue as number, //parseFloat(receiptAmount as string),
                "Add",
                formattedDate
              );

              console.log("Balance update result:", result);
            } catch (error) {
              console.error("Failed to update balance:", error);
            }

            // Update Ledger
            const LedgerUpdate = await updateLedger(
              societyName as string,
              groupTo,
              ledgerAccount,
              receiptAmountValue as number, //parseFloat(receiptAmount as string),
              "Add",
              formattedDate
            ); // Update Ledger
            console.log(LedgerUpdate);
            const LedgerUpdate2 = await updateLedger(
              societyName as string,
              "Current Liabilities",
              "Members Advanced",
              receiptAmountValue as number, //parseFloat(amount as string),
              "Add",
              formattedDate
            ); // Update Ledger
            console.log(LedgerUpdate2);
            // ✅ treat advance like a pseudo-bill for notification/email
            processedBills.push({
              title: "Advance Payment",
              amountToPay: receiptValue,
              id: transactionId,
            });
          } else {
            console.error(
              "Invalid receiptAmount, unable to update currentBalance."
            );
            return;
          }
        }
        // ---------------------------
        // Common: Notifications + Emails
        // ---------------------------
        const flatDocSnapFinal = await getDoc(flatDocRef);
        if (flatDocSnapFinal.exists()) {
          const flatData = flatDocSnapFinal.data();
          const userDetails = flatData?.userDetails || {};
          let tokens: string[] = [];
          let userEmail = "";
          let userName = "";

          Object.values(userDetails).forEach((entry: any) => {
            if (entry.nativeTokens && Array.isArray(entry.nativeTokens)) {
              tokens.push(...entry.nativeTokens);
            }
            if (entry.userEmail) userEmail = entry.userEmail;
            if (entry.userName) userName = entry.userName;
          });

          const paymentDate = new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });

          for (const bill of processedBills) {
            try {
              if (tokens.length) {
                await sendPushNotification(
                  tokens,
                  "Payment Successful",
                  `Your payment of ₹${bill.amountToPay} for ${wing}-${flatNumber} against ${bill.title} is successful.`,
                  {
                    flat: `${wing}-${flatNumber}`,
                    amount: String(bill.amountToPay),
                    billId: bill.id,
                  }
                );
              }

              if (userEmail) {
                await sendEmailNew({
                  to: userEmail,
                  subject: `Payment Successful - ${bill.title}`,
                  text: `Dear ${userName || "Resident"},\n\nYour payment of ₹${bill.amountToPay?.toFixed(
                    2
                  )} for "${bill.title}" on ${paymentDate} is successful. The bill was raised against your apartment ${wing}-${flatNumber}, ${societyName}-.\nYou can access the receipt for this transaction on your App.\n\nThank you.`,
                });
              }
            } catch (err) {
              console.error("❌ Failed to send notification/email:", err);
            }
          }
        }

        Alert.alert("Success", "Receipt processed successfully.", [
          {
            text: "OK",
            onPress: () => {
              setLoading(false); // stop spinner
              router.replace({
                pathname: "/member/myBill",
              });
            },
          },
        ]);
      } catch (error) {
        console.error("Error in handleAccept:", error);
        Alert.alert("Error", "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    // ✅ Only run when payment is marked successful
    if (isPaymentSuccessful) {
      clearBillAndUpdateLedger();
    }
  }, [isPaymentSuccessful]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, color: "green" }}>Payment Success!</Text>
      <Text>Selected IDs: {parsedIds.join(", ")}</Text>
      <Text>Selected Bills: {parsedBills.join(", ")}</Text>
      <Text>flatRef: {flatRef}</Text>
    </View>
  );
}
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
});
