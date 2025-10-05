import React, { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Button,
  ActivityIndicator,
} from "react-native";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { updateLedger } from "../../../../utils/updateLedger";
import { getBillItemsLedger } from "../../../../utils/getBillItemsLedger";

import AppbarComponent from "../../../../components/AppbarComponent";

import { useSociety } from "../../../../utils/SocietyContext";
import { sendEmailNew } from "../../../../utils/sendEmailNew";

// Define the types for parsed items
interface BillItem {
  itemName: string;
  ownerAmount?: number;
  rentAmount?: number;
  closedAmount?: number;
  ledgerAccount?: string;
  groupFrom?: string;
  updatedLedgerAccount?: string;
}

const NextScreenSpecial = () => {
  const { societyName } = useSociety();
  const {
    name,
    note,
    balancesheet,
    startDate,
    endDate,
    dueDate,
    invoiceDate,
    members,
    items,
    isEnablePenalty,
    Occurance,
    recurringFrequency,
    penaltyType,
    fixPricePenalty,
    percentPenalty,
    ledgerAccountPenalty,
    ledgerAccountGroupPenalty,
  } = useLocalSearchParams();
  const router = useRouter();

  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;
  const customFlatsBillsSubcollectionName = `${societyName} bills`;

  const specialBillCollectionName = `specialBills_${societyName}`;

  const [loading, setLoading] = useState(false);

  // Parse the JSON string for items
  let parsedItems: BillItem[] = [];

  try {
    if (items) {
      parsedItems = JSON.parse(items as string); // Safely parse items if it exists
    } else {
      console.warn("Items parameter is undefined or empty.");
    }
  } catch (error) {
    console.error("Error parsing items:", error);
    Alert.alert("Error", "Failed to parse bill items. Please try again.");
  }

  // 🔔 Helper function to send FCM notification
  async function sendPushNotification(
    tokens: string[],
    title: string,
    body: string,
    data: any = {}
  ) {
    if (!tokens.length) return;

    try {
      const res = await fetch(
        "https://myhousingappvercel.vercel.app/api/sendNotification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tokens,
            title,
            body,
            data,
          }),
        }
      );
      return res; // ✅ return the Response so caller can use .json()
    } catch (err) {
      console.error("Error sending push notification:", err);
    }
  }

  // Generate bill number
  const generateBillNumber = async (): Promise<string> => {
    try {
      const counterRef = doc(
        db,
        "Societies",
        societyName,
        "Meta",
        "billgenerationCounter"
      );
      const counterDoc = await getDoc(counterRef);

      let count = 1;
      if (counterDoc.exists()) {
        count = counterDoc.data().count + 1;
      }

      // ✅ setDoc will create the document if it doesn't exist
      await setDoc(counterRef, { count }, { merge: true });
      // 🔥 Generate financial year string dynamically
      const currentYear = new Date().getFullYear();
      const nextYear = (currentYear + 1).toString().slice(-2); // last 2 digits
      const financialYear = `${currentYear}-${nextYear}`;

      return `Bill No.INV-${financialYear}-${count}`;
    } catch (error) {
      console.error("Error generating bill number:", error);
      Alert.alert("Error", "Failed to generate bill number.");
      throw error;
    }
  };

  // Handle bill generation
  const handleGenerateBill = async () => {
    Alert.alert(
      "Confirmation",
      "Are you sure to generate a new bill?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              const billNumber = await generateBillNumber();
              setLoading(true);

              const billData = {
                name,
                note,
                balancesheet,
                startDate,
                endDate,
                dueDate,
                invoiceDate,
                members,
                items: parsedItems,
                billType: "Special Bill",
                billNumber,
                isEnablePenalty,
                Occurance,
                recurringFrequency,
                penaltyType,
                fixPricePenalty,
                percentPenalty,
                ledgerAccountPenalty,
                ledgerAccountGroupPenalty,
              };

              // Create bill in Firestore
              await setDoc(
                doc(
                  db,
                  "Societies",
                  societyName,
                  specialBillCollectionName,
                  billNumber
                ),
                billData
              );

              // flatPath Societies/Z delete/Z delete wings/B/Z delete floors/Floor 3/Z delete flats/303

              const selectedMembers = members
                ? (members as string).split(",").map((member) => member.trim())
                : [];

              const updatePromises = [];

              // 🔔 Notification payloads
              const notificationPayloads: {
                tokens: string[];
                flat: string;
                amount: number;
              }[] = [];

              // Iterate through selected members
              for (const member of selectedMembers) {
                const [floor, wing, flat] = member.split("-");
                console.log(
                  `Processing: Wing=${wing}, Floor=${floor}, Flat=${flat}`
                );

                const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floor}/${customFlatsSubcollectionName}/${flat}`;
                const flatDocRef = doc(db, flatRef);
                const flatDocSnap = await getDoc(flatDocRef);

                if (!flatDocSnap.exists()) {
                  console.warn(
                    `Flat ${flat} not found on floor ${floor} in wing ${wing}.`
                  );
                  continue;
                }

                const flatDetails = flatDocSnap.data();
                const residentType = flatDetails.resident;

                // 🔹 Collect tokens for this flat
                // Extract userEmail & push tokens
                let userEmail = "";
                const tokens: string[] = [];
                const userDetails = flatDetails?.userDetails || {};
                Object.values(userDetails).forEach((entry: any) => {
                  if (entry.userEmail) userEmail = entry.userEmail;
                  if (entry.nativeTokens && Array.isArray(entry.nativeTokens)) {
                    tokens.push(...entry.nativeTokens);
                  }
                });

                // Mahesh Start

                // Call the function to get bill details
                const billItemLedger = await getBillItemsLedger(
                  societyName,
                  billNumber,
                  flatDetails.resident
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
                  const ledgerUpdate1 = await updateLedger(
                    societyName,
                    "Account Receivable",
                    updatedLedgerAccount,
                    amount,
                    "Add",
                    invoiceDate
                  );
                  const ledgerUpdate2 = await updateLedger(
                    societyName,
                    groupFrom,
                    ledgerAccount,
                    amount,
                    "Add",
                    invoiceDate
                  );
                  console.log(`  Ledger Update Status: ${ledgerUpdate1}`);
                  console.log(`  Ledger Update Status: ${ledgerUpdate2}`);
                }

                // Mahesh End

                // Calculate amount based on resident type
                let amount = 0;
                if (residentType === "owner") {
                  amount = parsedItems.reduce(
                    (sum, item) => sum + (item.ownerAmount || 0),
                    0
                  );
                } else if (residentType === "Renter") {
                  amount = parsedItems.reduce(
                    (sum, item) => sum + (item.rentAmount || 0),
                    0
                  );
                } else if (residentType === "Closed") {
                  amount = parsedItems.reduce(
                    (sum, item) => sum + (item.closedAmount || 0),
                    0
                  );
                }

                const billEntry: any = {
                  status: "unpaid",
                  amount,
                  originalAmount: amount,
                  dueDate: dueDate as string,
                  billType: "Special Bill",
                  startDate: startDate,
                  name: name,
                  isEnablePenalty,
                };

                // Add the bill entry to the flat's bills collection
                const billsCollectionRef = collection(
                  flatDocRef,
                  customFlatsBillsSubcollectionName
                );
                const billDocRef = doc(billsCollectionRef, billNumber);

                updatePromises.push(setDoc(billDocRef, billEntry));
                // 🔔 Store notification payload for this flat
                if (tokens.length) {
                  notificationPayloads.push({ tokens, flat, amount });
                }
                // Send email using reusable sendEmail
                if (userEmail) {
                  await sendEmailNew({
                    to: userEmail,
                    subject: `New Bill Generated: ${billNumber}`,
                    text: `Dear Resident, \n\nYour bill for ${name} is generated.\nTotal Amount: ₹${amount}\nDue Date: ${dueDate}\n\nThank you.`,
                  });
                }
              }

              // Wait for all updates to complete
              await Promise.all(updatePromises);

              // 🔔 Send notifications after all DB updates
              for (const { tokens, flat, amount } of notificationPayloads) {
                console.log(tokens, flat, amount);
                const res = await sendPushNotification(
                  tokens,
                  `New Bill Generated`,
                  `${name} for ${societyName}, Flat ${flat} - ₹${amount}`,
                  {
                    billNumber,
                    societyName,
                    flat,
                    amount: String(amount), // convert number to string
                  }
                );

                if (res) {
                  const json = await res.json();
                  console.log("Push notification response:", json);
                }
              }

              // Clear AsyncStorage
              await AsyncStorage.removeItem("@createdBillItem");

              Alert.alert(
                "Success",
                `Bill ${billNumber} created and updated successfully in wings.`,
                [
                  {
                    text: "OK",
                    onPress: () => router.replace("../SpecialBills"),
                  },
                ]
              );
            } catch (error) {
              console.error("Error generating bill:", error);
              Alert.alert("Error", "Failed to create bill. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      {/* Top Appbar */}
      <AppbarComponent title={name as string} source="Admin" />
      <ScrollView style={styles.container}>
        <View>
          <Text style={styles.header}>General Details</Text>
          <Text>Name: {name}</Text>
          <Text>Note: {note}</Text>
          <Text>Balance Sheet: {balancesheet}</Text>
          <Text>
            Duration: {startDate} - {endDate}
          </Text>
          <Text>Due Date: {dueDate}</Text>
          <Text>Invoice Date: {invoiceDate}</Text>
          <Text>members: {members}</Text>
        </View>

        <View>
          <Text style={styles.header}>Bill Items</Text>
          {parsedItems.map((item, index) => (
            <View key={index} style={styles.itemContainer}>
              <Text>Name: {item.itemName}</Text>
              <Text>Owner Amount: {item.ownerAmount}</Text>
              <Text>Rent Amount: {item.rentAmount}</Text>
              <Text>Closed Amount: {item.closedAmount}</Text>
              <Text>Ledger Account: {item.ledgerAccount}</Text>
              <Text>Ledger Group: {item.groupFrom}</Text>
              <Text>Ledger Account updated: {item.updatedLedgerAccount}</Text>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Generate Bill" onPress={handleGenerateBill} />
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
  },
  itemContainer: {
    marginVertical: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
  },
  buttonContainer: {
    marginVertical: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default NextScreenSpecial;
