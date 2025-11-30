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

import AsyncStorage from "@react-native-async-storage/async-storage";

import AppbarComponent from "../../../../components/AppbarComponent";

import { useSociety } from "../../../../utils/SocietyContext";

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

const NextScreenScheduled = () => {
  const { societyName } = useSociety();
  const {
    name,
    note,
    balancesheet,
    startDate,
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
    billduration,
    billdueduration,
  } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // const customWingsSubcollectionName = `${societyName} wings`;
  // const customFloorsSubcollectionName = `${societyName} floors`;
  // const customFlatsSubcollectionName = `${societyName} flats`;
  // const customFlatsBillsSubcollectionName = `${societyName} bills`;
  // const customFlatsBillsSubcollectionName = "flatbills";

  // const specialBillCollectionName = `specialBills_${societyName}`;
  // const scheduledBillCollectionName = `scheduledBills_${societyName}`;

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

  // Handle bill generation
  const handleGenerateBill = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        "https://myhousingappvercel.vercel.app/api/generateBill",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            societyName,
            name,
            note,
            balancesheet,
            startDate,
            members,
            items: parsedItems, // already parsed JSON
            isEnablePenalty,
            Occurance,
            recurringFrequency,
            penaltyType,
            fixPricePenalty,
            percentPenalty,
            ledgerAccountPenalty,
            ledgerAccountGroupPenalty,
            billduration,
            billdueduration,
          }),
        }
      );

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        const error = err as Error;
        console.log("err in scheduled bill handleGenerateBill", error);
        console.error("Non-JSON response:", text);
        throw new Error("Server did not return JSON");
      }
      if (data.success) {
        // Clear AsyncStorage
        await AsyncStorage.removeItem("@createdBillItem");
        await AsyncStorage.removeItem("@scheduleBillForm");
        Alert.alert(
          "Success",
          `Bill ${data.billNumber} created successfully!`,
          [
            {
              text: "OK",
              onPress: () => router.replace("/admin/Bills/Maintenance"),
            },
          ]
        );
      } else {
        Alert.alert("Error", data.error || "Bill generation failed.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Schedule Bill Cron Job (every 5 minutes)
  const handleScheduleBillCronJob = async () => {
    try {
      const normalizedPayload = {
        societyName,
        name,
        note,
        balancesheet,
        startDate,
        members,
        items: parsedItems,
        isEnablePenalty: Array.isArray(isEnablePenalty)
          ? isEnablePenalty[0] === "true"
          : isEnablePenalty === "true",
        Occurance: Occurance || null,
        recurringFrequency: recurringFrequency || null,
        penaltyType: penaltyType || null,
        fixPricePenalty: fixPricePenalty ? Number(fixPricePenalty) : null,
        percentPenalty: percentPenalty ? Number(percentPenalty) : null,
        ledgerAccountPenalty: ledgerAccountPenalty || null,
        ledgerAccountGroupPenalty: ledgerAccountGroupPenalty || null,
        billduration,
        billdueduration,
        schedule: {
          timezone: "Asia/Kolkata",
          expiresAt: 0,
          hours: [-1],
          mdays: [-1],
          minutes: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
          months: [-1],
          wdays: [-1],
        },
      };

      setLoading(true);
      const res = await fetch(
        "https://myhousingappvercel.vercel.app/api/createBillCronJob",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(normalizedPayload),
        }
      );

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        const error = err as Error;
        console.log("err in scheduled bill handleScheduleBillCronJob", error);
        console.error("Non-JSON response from createBillCronJob:", text);
        throw new Error("Server did not return valid JSON");
      }

      if (res.ok) {
        Alert.alert("Success", "Bill Cron Job scheduled every 5 minutes 🚀");
        await AsyncStorage.removeItem("@createdBillItem");
        await AsyncStorage.removeItem("@scheduleBillForm");
        router.replace("/admin/Bills/Maintenance");
      } else {
        Alert.alert("Error", data?.error || "Failed to schedule cron job.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong.");
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
    <>
      {/* Top Appbar */}
      <AppbarComponent title={name as string} source="Admin" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: 100, // 👈 add enough gap for footer + FAB
        }}
      >
        <View>
          <Text style={styles.header}>General Details</Text>
          <Text>Name: {name}</Text>
          <Text>Note: {note}</Text>
          <Text>Balance Sheet: {balancesheet}</Text>
          <Text>Billduration: {billduration}</Text>
          <Text>Billdueduration: {billdueduration}</Text>

          <Text>members: {members}</Text>
          <Text>start Date: {startDate}</Text>
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
        <View style={styles.buttonContainer}>
          <Button
            title="Schedule Bill (Every 5 min)"
            onPress={handleScheduleBillCronJob}
          />
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
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
});

export default NextScreenScheduled;
