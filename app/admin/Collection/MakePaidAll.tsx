import { StyleSheet, View, Alert, ScrollView, TextInput, TouchableOpacity } from 'react-native'
import React, { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { useSociety } from "../../../utils/SocietyContext";
import { Appbar, Text, Divider, Avatar } from "react-native-paper";
import Dropdown from "../../../utils/DropDown";
import PaymentDatePicker from "../../../utils/paymentDate";
import { db } from "@/firebaseConfig";
import { collection, doc, getDoc, getDocs, query, where, setDoc } from "firebase/firestore";
import { generateVoucherNumber } from "../../../utils/generateVoucherNumber";

const MakePaidAll = () => {
    const router = useRouter();
    const societyContext = useSociety();

    const localParams = useLocalSearchParams();
    // Determine params based on source
    const societyName = societyContext.societyName;
    const wing =localParams.wing as string;
    const flatNumber = localParams.flatNumber as string;  
    const floorName = localParams.floorName as string; 
    const totalDue =  parseFloat(localParams.totalDue as string);
    const currentBalance = parseFloat(localParams.currentBalance as string);
    const totalUncleared = isNaN(parseFloat(localParams.totalUncleared as string))? 0 : parseFloat(localParams.totalUncleared as string);

    const selectedIds = localParams.selectedIds

    const reciptAmount =  localParams.totalAmount as string || "0";

      const [amount, setAmount] = useState(reciptAmount);
      const [note, setNote] = useState("");
      const [ledgerAccount, setLedgerAccount] = useState<any>("");
      const [accountFromOptions, setAccountFromOptions] = useState<{ label: string; value: string }[]>([]);
      const [paymentDate, setPaymentDate] = useState(new Date(localParams.paymentDate as string || Date.now()));

      
    useEffect(() => {
        const fetchAccountOptions = async () => {
        try {
            const ledgerGroupsRef = collection(db, "ledgerGroups");
            const fromQuerySnapshot = await getDocs(
            query(ledgerGroupsRef, where("name", "in", ["Bank Accounts", "Cash in Hand"]))
            );

            const fromAccounts = fromQuerySnapshot.docs
            .map((doc) => doc.data().accounts || [])
            .flat()
            .filter((account) => account.trim() !== "")
            .map((account) => ({ label: account, value: account }));

            setAccountFromOptions(fromAccounts);
        } catch (error) {
            console.error("Error fetching account options:", error);
            Alert.alert("Error", "Failed to fetch account options.");
        }
        };

        fetchAccountOptions();
    }, []);

    // Format date as YYYY-MM-DD
    const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
      };

    const [formattedDate, setFormattedDate] = useState(formatDate(paymentDate));

    const handlePaid = async () => {
        try {
            // Check if a ledger account is selected
            if (!ledgerAccount) {
                Alert.alert("Error", "Please select a ledger account.");
                return;
            }
            // Parse and validate receiptAmount
            const receiptAmountValue = parseFloat(amount as string);
            if (isNaN(receiptAmountValue) || receiptAmountValue <= 0) {
                Alert.alert("Error", "Invalid receipt amount. Please enter a valid number.");
                return;
            }

            const societiesDocRef = doc(db, "Societies", societyName as string);
            const societyDocSnap = await getDoc(societiesDocRef);
        
            if (!societyDocSnap.exists()) {
                console.error("Societies document does not exist");
                Alert.alert("Error", "Society document not found.");
                return;
            }
            const societyData = societyDocSnap.data();
            const relevantFlatData = societyData?.wings?.[wing]?.floorData?.[floorName]?.[flatNumber];

            // Update the status of bills in the bills map
            const updatedBills = { ...relevantFlatData.bills };

             // Parse selected IDs from local params
          let parsedSelectedIds: any;

          // Initialize voucherNumber array
          let voucherNumberArray: string[] = [];

          try {
                // Parse `selectedIds` if it's a string
                parsedSelectedIds = typeof selectedIds === "string" ? JSON.parse(selectedIds) : selectedIds;
            } catch (error) {
                console.error('Error parsing selectedIds:', error);
            }
            if (Array.isArray(parsedSelectedIds) && parsedSelectedIds.length > 0) {
                let remainingReceiptValue = receiptAmountValue; // Track remaining receiptAmount globally
                for (const billId of parsedSelectedIds) {
                    const normalizedBillId = billId.trim();
                
                    if (updatedBills[normalizedBillId]) {
                      const bill = updatedBills[normalizedBillId];

                      // Handle remaining bill amount with remainingReceiptValue
                            if (remainingReceiptValue > 0) {
                            const remainingVoucherNumber = await generateVoucherNumber(); // Generate separate voucher for receipt
                            voucherNumberArray.push(remainingVoucherNumber);
                            const amountToApply = Math.min(remainingReceiptValue, bill.amount);
                    
                            // Deduct from bill amount
                            bill.amount -= amountToApply;
                            remainingReceiptValue -= amountToApply;
                    
                            // Update received array with remaining receipt amount
                            bill.received = bill.received || [];
                            bill.received.push({
                                receiptAmount: amountToApply,
                                paymentDate: formattedDate,
                                voucherNumber: remainingVoucherNumber,
                            });
                            }
                    
                            // Update status
                            bill.status = bill.amount === 0 ? "paid" : "unpaid";
                    
                            // Ensure all updates to the bill are saved
                            updatedBills[normalizedBillId] = bill;


                    } else {
                    console.error(`Bill with ID ${normalizedBillId} not found in updatedBills`);
                    }
                };
                

            }else {
            console.log("No selected IDs.");
            
          }

          

          if (relevantFlatData) {
          // Update the specific flat's data with the modified unclearedBalance array
          const updatedFlatData = {
            ...relevantFlatData,
            bills: updatedBills,
          };
    
          // Construct the updated society structure
          const updatedSocietyData = {
            ...societyData,
            wings: {
              ...societyData.wings,
              [wing]: {
                ...societyData.wings[wing],
                floorData: {
                  ...societyData.wings[wing].floorData,
                  [floorName]: {
                    ...societyData.wings[wing].floorData[floorName],
                    [flatNumber]: updatedFlatData, // Update only this flat
                  },
                },
              },
            },
          };
    
          // Save the updated data back to Firestore
          await setDoc(societiesDocRef, updatedSocietyData);
          
    
          Alert.alert("Success", "Receipt processed successfully.");
          router.push(
            {
              pathname: "/admin/Collection/FlatCollectionSummary",
              params: {
                wing: wing,
                floorName: floorName,
                flatNumber: flatNumber,
              },
            }
          );
        } else {
          console.error("Relevant flat data not found.");
          Alert.alert("Error", "Flat data not found.");
        }

        } catch (error) {
                console.error("Failed to update receipt:", error);
                Alert.alert("Error", "Failed to accept receipt. Please try again.");
              }
    };
      
  return (
    <View style={styles.container}>
        {/* Remove Stack Header */}
        <Stack.Screen options={{ headerShown: false }} />

        {/* Appbar Header */}
        <Appbar.Header style={styles.header}>
            <Appbar.BackAction onPress={() => router.back()} color="#fff" />
            <Appbar.Content title="Make Paid all" titleStyle={styles.titleStyle} />
        </Appbar.Header>

        {/* Profile Header */}
        <View style={styles.profileContainer}>
            <Avatar.Text size={44} label="XD" style={styles.avatar} />
            <View style={styles.textContainer}>
                <Text style={styles.profileText}>{wing} {flatNumber}</Text>
            </View>
        </View>

        <Divider style={{ backgroundColor: "white", height: 1 }} />

        {/* Balance Summary */}
        <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
                <Text style={styles.summaryTitle}>Total Due</Text>
                <Text style={styles.summaryValue}>
                    ₹ {totalDue.toFixed(2)}
                </Text>
            </View>
            <View style={styles.summaryItem}>
                <Text style={styles.summaryTitle}>Current Balance</Text>
                <Text style={styles.summaryValue}>₹ {currentBalance.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryItem}>
                <Text style={styles.summaryTitle}>Uncleared Balance</Text>
                <Text style={styles.summaryValue}>₹ {totalUncleared.toFixed(2)}</Text>
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
            data={accountFromOptions}
            onChange={setLedgerAccount}
            placeholder="Select Account"
          />
        </View>
            {/* Payment Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Payment Date</Text>
          <PaymentDatePicker
            initialDate={paymentDate}
            onDateChange={setPaymentDate}
          />
        </View>

        <Text style={styles.redlabel}>* Kindly check details properly. You can not undo this action</Text>

      </ScrollView>

        {/* Paid and Cancel Actions */}
        <View style={styles.actionsContainer}>
            <TouchableOpacity
            style={styles.actionButtonPaid}
            onPress={() => handlePaid()} 
            >
            <Text style={styles.actionTextPaid}>Paid</Text>
            </TouchableOpacity>

            <TouchableOpacity
            style={styles.actionButtonCancle}
            onPress={() => router.back()}
            >
            <Text style={styles.actionTextCancel}>Cancel</Text>
            </TouchableOpacity>
            </View>


      
    </View>
  )
}

export default MakePaidAll

const styles = StyleSheet.create({
    container: {flex: 1, backgroundColor: "#f5f5f5",},
    header: { backgroundColor: "#6200ee" },
    titleStyle: {color: '#fff',fontSize: 18,fontWeight: 'bold',},
    profileContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, backgroundColor: "#6200ee", paddingBottom:10},
    profileText: { fontSize: 14, color: "white",},
    textContainer: {justifyContent: 'center',},
    avatar: { backgroundColor: '#6200ee', marginRight: 10, borderColor:'#fff', borderWidth:2},
    summaryContainer: {flexDirection: "row", justifyContent: "space-between", padding: 16, backgroundColor: "#6200ee",},
    summaryItem: { alignItems: "center" },
    summaryTitle: { color: "white", fontSize: 12 },
    summaryValue: { color: "white", fontWeight: "bold", fontSize: 12 },
    formContainer: { padding: 16 },
    redlabel: { fontSize: 14, marginBottom: 16, color: "red" },
    label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
    input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 4, padding: 10, marginBottom: 16, fontSize: 16 },
    noteInput: { height: 80, textAlignVertical: "top" },
    section: { marginBottom: 16 },
    actionsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        padding: 10,
      },
      actionButtonPaid: {
        flex: 1,
        marginHorizontal: 8,
        paddingVertical: 12,
        backgroundColor: "#6200ee",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#6200ee",
        alignItems: "center",
        justifyContent: "center",
      },
      actionButtonCancle: {
        flex: 1,
        marginHorizontal: 8,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#6200ee",
        alignItems: "center",
        justifyContent: "center",
      },
      activeActionButton: {
        backgroundColor: "#fff",
        borderColor: "#fff",
      },
      actionTextPaid: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#fff",
      },
      actionTextCancel: {
        fontSize: 14,
        fontWeight: "bold",
        
      },
      activeActionText: {
        color: "#000",
      },
      divider: {color: "#fff"},
     
})