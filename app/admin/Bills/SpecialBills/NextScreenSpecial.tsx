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
import {
  collection,
  doc,
  getDoc,
  increment,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { db, app } from "@/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { updateLedger } from "../../../../utils/updateLedger";

import AppbarComponent from "../../../../components/AppbarComponent";

import { useSociety } from "../../../../utils/SocietyContext";

import { nowISTtimestamp } from "@/utils/dateFormatter";
import { getFlatCurrentBalance } from "@/utils/getFlatCurrentBalance";
import { generateTransactionId } from "@/utils/generateTransactionId";
import { GenerateVoucherNumber } from "@/utils/generateVoucherNumber";
import { updateFlatCurrentBalance } from "@/utils/updateFlatCurrentBalance";
import { useAuthRole } from "@/lib/authRole";
import { getFunctions, httpsCallable } from "firebase/functions";

interface PreloadResult {
  ok: boolean;
  skipped?: boolean;
  member: any;
  wing: any;
  flat: any;
  flatPath: string;
  flatDetails: any;
  userIds: string[];
  userEmails: string[];
  userNames: string[];
  tokens: string[];
  amount: number;
  currentFlatBalanceValue: number;
  commonBillData: any;
  billItemTotals: any; // ⬅ ADD THIS
}

// ---------- Helpers (JS Version) ----------
/**
 * Run tasks in batches with given concurrency limit.
 * tasks: array of functions that return a Promise when called
 */
// ---------- Helpers (TS Friendly Minimal Version) ----------
/**
 * Run tasks in batches with given concurrency limit.
 * tasks: array of functions that return a Promise when called
 */
const runBatches = async (
  taskFns: (() => Promise<any>)[],
  concurrency: number = 20
): Promise<any[]> => {
  const results: any[] = [];

  for (let i = 0; i < taskFns.length; i += concurrency) {
    const batch = taskFns.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }

  return results;
};

// Define the types for parsed items
interface BillItem {
  itemName: string;
  ownerAmount?: number;
  rentAmount?: number;
  closedUnitAmount?: number;
  ledgerAccount?: string;
  groupFrom?: string;
  updatedLedgerAccount?: string;
}

// const BATCH_SIZE = 25; // tweakable — how many flats to process in parallel

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
    ownerBillAmount,
    rentBillAmount,
    closedBillAmount,
  } = useLocalSearchParams();
  const router = useRouter();

  const { userName } = useAuthRole();

  const functions = getFunctions(app, "us-central1");
  // const sendNotificationFn = httpsCallable(functions, "sendNotification");
  const generatespecialbill = httpsCallable(functions, "generatespecialbill");

  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;
  // const customFlatsBillsSubcollectionName = `${societyName} bills`;
  const customFlatsBillsSubcollectionName = "flatbills";

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // 0..100
  const currentDate = new Date().toISOString().split("T")[0];

  // Parse the JSON string for items
  let parsedItems: BillItem[] = [];
  try {
    if (items) {
      parsedItems = JSON.parse(items as string);
      // console.log("parsedItems", parsedItems);
    } else {
      console.warn("Items parameter is undefined or empty.");
    }
  } catch (error) {
    console.error("Error parsing items:", error);
    Alert.alert("Error", "Failed to parse bill items. Please try again.");
  }

  // console.log("parsedItems", parsedItems);

  //  Reserve Bill Numbers (single transaction)

  const reserveBillNumbers = async (
    societyName: string,
    count: number
  ): Promise<string[]> => {
    const counterRef = doc(
      db,
      "Societies",
      societyName,
      "Meta",
      "billgenerationCounter"
    );

    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);

      let last = 0;

      if (!snap.exists()) {
        // Create counter if not exists
        transaction.set(counterRef, { count: 0 });
      } else {
        last = snap.data()?.count || 0;
        transaction.update(counterRef, { count: increment(count) });
      }

      // New bill numbers will be last+1 to last+count
      const start = last + 1;
      const end = last + count;

      // Compute financial year
      const currentYear = new Date().getFullYear();
      const nextYear = (currentYear + 1).toString().slice(-2);
      const financialYear = `${currentYear}-${nextYear}`;

      // Create array of bill numbers
      const billNumbers: string[] = [];
      for (let i = start; i <= end; i++) {
        billNumbers.push(`${societyName}-Bill No.INV-${financialYear}-${i}`);
      }

      return billNumbers;
    });
  };

  // Extract members once
  const selectedMembers = members
    ? (members as string).split(",").map((m) => m.trim())
    : [];

  // ---------- Phase 1: Preload (safe-to-run-in-parallel reads + compute) ----------
  /**
   * Returns either { skipped: true } (dead/missing) or preload data needed for write phase.
   */
  const preloadFlat = async (member: string, commonBillData: any) => {
    try {
      const [floor, wing, flat] = member.split("-");
      const flatPath = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floor}/${customFlatsSubcollectionName}/${flat}`;
      const flatDocRef = doc(db, flatPath);
      const flatDocSnap = await getDoc(flatDocRef);

      if (!flatDocSnap.exists()) {
        console.warn(`Flat ${flat} not found: ${member}`);
        return { ok: true, skipped: true, member };
      }

      const flatDetails = flatDocSnap.data();
      const flatType = (flatDetails?.flatType || "").toString().toLowerCase();

      if (flatType === "dead") {
        return { ok: true, skipped: true, member };
      }

      // Compute amount from parsedItems (pure local)
      let amount = 0;
      if (flatType === "owner") amount = Number(ownerBillAmount ?? 0);
      else if (flatType === "rent") amount = Number(rentBillAmount ?? 0);
      else if (flatType === "closed") amount = Number(closedBillAmount ?? 0);

      const billItemTotals = new Map();

      (parsedItems || []).forEach((item) => {
        let amt = 0;
        if (flatType === "owner") amt = item.ownerAmount || 0;
        else if (flatType === "rent") amt = item.rentAmount || 0;
        else if (flatType === "closed") amt = item.closedUnitAmount || 0;

        const key = `${item.groupFrom}||${item.ledgerAccount}`;
        billItemTotals.set(key, (billItemTotals.get(key) || 0) + amt);
      });

      // Read current balance (read only; safe in parallel)
      const currentFlatBalanceValue = await getFlatCurrentBalance(
        flatPath,
        societyName,
        flat
      );

      // Return minimal preload object (NO writes, no billNumber generation)
      return {
        ok: true,
        skipped: false,
        member,
        flat,
        floor,
        wing,
        flatPath,
        flatDetails,
        flatType,
        amount,
        currentFlatBalanceValue,
        commonBillData,
        billItemTotals,
      };
    } catch (err) {
      console.error("preloadFlat error:", member, err);
      return { ok: false, error: err, member };
    }
  };

  // -----------------------------------------------------
  // Phase A: Preload all flats concurrently
  // -----------------------------------------------------
  const runPreloadPhase = async (
    selectedMembers: any[],
    commonBillData: any
  ) => {
    const preloadConcurrency = 50;

    const preloadTasks = selectedMembers.map((member) => {
      return () => preloadFlat(member, commonBillData);
    });

    const preloadResults = await runBatches(preloadTasks, preloadConcurrency);

    const validPreloads = preloadResults
      .map((r, idx) => ({ r, idx }))
      .filter((x) => x.r && x.r.ok && !x.r.skipped)
      .map((x) => x.r);

    return {
      validPreloads,
      skippedCount: preloadResults.filter((p) => p && p.skipped).length,
      preloadErrors: preloadResults.filter((p) => p && p.ok === false),
    };
  };

  // -----------------------------------------------------
  // Phase B: Process a single flat (per-flat writes)
  // -----------------------------------------------------
  const processOneFlat = async (
    preload: PreloadResult,
    societyName: string,
    customFlatsBillsSubcollectionName: string,
    receivableTotals: Map<string, number>,
    setProgress: (val: number) => void,
    index: number,
    skippedCount: number,
    totalMembers: number,
    billNumber: string, // ← pass it here
    masterBillId: string
  ) => {
    const {
      member,
      flatPath,
      amount,
      currentFlatBalanceValue,
      commonBillData,
      billItemTotals, // ⬅ ADD THIS
    } = preload;

    try {
      // 1) Generate bill number + save master bill
      // const billNumber = await generateBillNumber();

      const billData = {
        ...commonBillData,
        billNumber,
        members: member,
        flatPath,
      };

      // await setDoc(doc(db, "Bills", billNumber), billData);

      // 2) Item-level ledger rows

      // Convert Map to array for storing in billEntry
      const billItemLedger = Array.from(
        billItemTotals,
        ([key, amount]: [string, number]) => {
          const [groupFrom, ledgerAccount] = key.split("||");

          return {
            groupFrom,
            ledgerAccount,
            updatedLedgerAccount: `${ledgerAccount} Receivables`,
            amount,
            invoiceDate: commonBillData.invoiceDate,
          };
        }
      );

      let billEntry;

      // -----------------------------------------------------
      // PAID path
      // -----------------------------------------------------
      if (currentFlatBalanceValue >= amount && amount !== 0) {
        const [transactionId, voucherNumber] = await Promise.all([
          generateTransactionId(),
          GenerateVoucherNumber(societyName),
        ]);

        billEntry = {
          societyName,
          status: "paid",
          amount,
          originalAmount: amount,
          dueDate,
          billType: "Special Bill",
          startDate,
          name,
          isEnablePenalty,
          paymentDate: startDate,
          paymentMode: "Wallet Auto",
          transactionId,
          voucherNumber,
          type: "Bill Paid",
          origin: "Bill Settelment",
          paidledgerAccount: "Bank",
          paidledgerGroup: "Bank Accounts",
          invoiceDate,
          masterBillId, // 👈 add
          billItemTotals: Object.fromEntries(billItemTotals), //  ⬅ ADD THIS
        };

        const unclearedRef = doc(
          db,
          flatPath,
          "unclearedBalances",
          transactionId
        );
        const balanceRef = collection(doc(db, flatPath), "flatCurrentBalance");

        await Promise.all([
          setDoc(unclearedRef, {
            amount,
            societyName,
            status: "Cleared",
            amountReceived: amount,
            paymentReceivedDate: invoiceDate,
            paymentMode: "Wallet Auto",
            transactionId,
            selectedIds: [billNumber],
            selectedBills: [billData],
            ledgerAccount: "Bank",
            ledgerAccountGroup: "Bank Accounts",
            voucherNumber,
            type: "Bill Paid",
            origin: "Bill Settelment",
          }),
          updateFlatCurrentBalance(
            balanceRef,
            amount,
            "Subtract",
            currentDate,
            societyName
          ),
        ]);

        // totalMembersAdvancedSubtract returned for global aggregation
        // not stored inside function
        const membersAdvancedSubtract = amount;

        // save bill under flat
        await saveBillUnderFlat(
          flatPath,
          billNumber,
          customFlatsBillsSubcollectionName,
          billEntry
        );

        return {
          membersAdvancedSubtract,
          error: null,
        };
      }

      // -----------------------------------------------------
      // UNPAID path
      // -----------------------------------------------------

      billEntry = {
        societyName,
        status: "unpaid",
        amount,
        originalAmount: amount,
        dueDate,
        billType: "Special Bill",
        startDate,
        name,
        isEnablePenalty,
        invoiceDate,
        masterBillId, // 👈 add
        billItemTotals: Object.fromEntries(billItemTotals), //  ⬅ ADD THIS
      };

      // accumulate receivables (per updated ledger)
      (billItemLedger || []).forEach((li) => {
        const ledger = li.updatedLedgerAccount || "";
        if (!ledger) return;
        receivableTotals.set(
          ledger,
          (receivableTotals.get(ledger) || 0) + (li.amount || 0)
        );
      });

      // save bill under flat
      await saveBillUnderFlat(
        flatPath,
        billNumber,
        customFlatsBillsSubcollectionName,
        billEntry
      );

      return {
        membersAdvancedSubtract: 0,
        error: null,
      };
    } catch (err) {
      return {
        error: { member: preload.member, err },
        notification: null,
        membersAdvancedSubtract: 0,
      };
    } finally {
      const processed = index + 1 + skippedCount;
      setProgress(Math.round((processed / totalMembers) * 100));
    }
  };

  // -----------------------------------------------------
  // Helper: Save bill under flat
  // -----------------------------------------------------
  const saveBillUnderFlat = async (
    flatPath: string,
    billNumber: string,
    subName: string,
    billEntry: any
  ) => {
    await setDoc(
      doc(collection(doc(db, flatPath), subName), billNumber),
      billEntry
    );
  };

  // -----------------------------------------------------
  // Helper: Notification object
  // -----------------------------------------------------

  // -----------------------------------------------------
  // Phase C: Apply aggregated ledger updates
  // -----------------------------------------------------
  const applyAggregatedLedgerUpdates = async (
    societyName: string,
    itemLedgerTotals: Map<string, number>,
    receivableTotals: Map<string, number>,
    totalMembersAdvancedSubtract: number
  ) => {
    const ledgerPromises = [];

    // item-level ledger totals
    for (const [key, amt] of itemLedgerTotals.entries()) {
      if (!amt) continue;
      const [groupFrom, ledgerAccount] = key.split("||");
      ledgerPromises.push(
        updateLedger(
          societyName,
          groupFrom,
          ledgerAccount,
          amt,
          "Add",
          currentDate
        )
      );
    }

    // receivables
    for (const [ledger, amt] of receivableTotals.entries()) {
      if (!amt) continue;
      ledgerPromises.push(
        updateLedger(
          societyName,
          "Account Receivable",
          ledger,
          amt,
          "Add",
          currentDate
        )
      );
    }

    // Members Advanced (paid flats)
    if (totalMembersAdvancedSubtract > 0) {
      ledgerPromises.push(
        updateLedger(
          societyName,
          "Current Liabilities",
          "Members Advanced",
          totalMembersAdvancedSubtract,
          "Subtract",
          currentDate
        )
      );
    }

    await Promise.all(ledgerPromises);
  };

  // ---------- Top-level orchestrator: handleGenerateBill (Option A) ----------
  const handleGenerateBill = async () => {
    Alert.alert(
      "Confirmation",
      "Are you sure to generate a new bill?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            setLoading(true);
            setProgress(0);

            try {
              const commonBillData = {
                societyName,
                name,
                note,
                balancesheet,
                startDate,
                endDate,
                dueDate,
                invoiceDate,
                items: parsedItems,
                billType: "Special Bill",
                isEnablePenalty,
                Occurance,
                recurringFrequency,
                penaltyType,
                fixPricePenalty,
                percentPenalty,
                ledgerAccountPenalty,
                ledgerAccountGroupPenalty,
                createdAt: nowISTtimestamp(),
                createdBy: userName,
              };

              // ---------- PHASE A: PRELOAD (parallel with concurrency limit) ----------
              // ------------------------------------
              // Phase A: Preload
              // ------------------------------------
              const { validPreloads, skippedCount, preloadErrors } =
                await runPreloadPhase(selectedMembers, commonBillData);

              if (preloadErrors.length) {
                console.warn("Some preload operations failed:", preloadErrors);
              }

              const allFlatPaths = validPreloads.map((p) => p.flatPath);

              // Sum of all flat bill amounts
              const totalBillAmount = validPreloads.reduce(
                (sum, flat) => sum + (flat.amount || 0),
                0
              );

              // Flats count
              const totalFlats = validPreloads.length;

              // PRE-GENERATE bill numbers
              const preGeneratedBillNumbers =
                totalFlats > 0
                  ? await reserveBillNumbers(societyName, totalFlats)
                  : [];

              // ------------------------------------
              // Aggregation holders
              // ------------------------------------
              const itemLedgerTotals = new Map();
              const receivableTotals = new Map();
              let totalMembersAdvancedSubtract = 0;

              const errors = [];

              validPreloads.forEach((p) => {
                for (const [key, amt] of p.billItemTotals.entries()) {
                  itemLedgerTotals.set(
                    key,
                    (itemLedgerTotals.get(key) || 0) + amt
                  );
                }
              });

              // Save master bill

              const masterBillData = {
                ...commonBillData,
                members,
                flatPaths: allFlatPaths,
                totalFlats: validPreloads.length,
                skippedFlats: skippedCount,
                billNumbers: preGeneratedBillNumbers,
                totalBillAmount,
                totalPaidAmount: totalMembersAdvancedSubtract,
              };

              const masterBillRef = doc(collection(db, "Bills")); // auto id
              await setDoc(masterBillRef, masterBillData);

              const masterBillId = masterBillRef.id;

              // ------------------------------------
              // Phase B: Sequential per-flat writes
              // ------------------------------------
              const results = await Promise.all(
                validPreloads.map((preload, i) =>
                  processOneFlat(
                    preload,
                    societyName,
                    customFlatsBillsSubcollectionName,
                    receivableTotals,
                    setProgress,
                    i,
                    skippedCount,
                    selectedMembers.length,
                    preGeneratedBillNumbers[i], // 👈 pass bill number
                    masterBillId // 👈 add this
                  )
                )
              );
              results.forEach((result) => {
                if (result.error) errors.push(result.error);
                totalMembersAdvancedSubtract += result.membersAdvancedSubtract;
              });

              // ------------------------------------
              // Phase C: Apply Aggregated Ledger Updates
              // ------------------------------------

              await applyAggregatedLedgerUpdates(
                societyName,
                itemLedgerTotals,
                receivableTotals,
                totalMembersAdvancedSubtract
              );

              // ------------------------------------
              // Phase D: collect notifications
              // ------------------------------------

              await setDoc(
                doc(
                  db,
                  "Societies",
                  societyName,
                  "Communications",
                  "pendingCommunication"
                ),
                {
                  jobs: [
                    {
                      masterBillId, // Only this is needed
                      name, // If you want the job name
                      createdAt: Date.now(),
                    },
                  ],
                }
              );

              // ---------- Cleanup ----------
              await AsyncStorage.removeItem("@createdBillItem");
              await AsyncStorage.removeItem("@specialBillForm");

              // UI result
              if (errors.length) {
                Alert.alert(
                  "Partial Success",
                  `Bill created but ${errors.length} flats failed.`
                );
              } else {
                Alert.alert("Success", "New Bill created successfully.", [
                  {
                    text: "OK",
                    onPress: () => router.replace("../SpecialBills"),
                  },
                ]);
              }
            } catch (err) {
              console.error("handleGenerateBill error:", err);
              Alert.alert("Error", "Failed to create bill. Please try again.");
            } finally {
              setLoading(false);
              setProgress(0);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const callGenerateSpecialBill = async () => {
    try {
      const start = Date.now(); // ⏱️ start timing
      setLoading(true);
      const result = await generatespecialbill({
        societyName,
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
        userName,
        ownerBillAmount,
        rentBillAmount,
        closedBillAmount,
      });

      console.log("Result:", result.data);
      const data = result.data as any;

      const { errors = [], preloadErrors = [] } = data;
      const end = Date.now(); // ⏱️ stop timing

      console.log(`⏳ Time taken: ${end - start} ms`);

      // ---------- Cleanup ----------
      await AsyncStorage.removeItem("@createdBillItem");
      await AsyncStorage.removeItem("@specialBillForm");
      // UI result
      if (errors.length > 0 || preloadErrors.length > 0) {
        Alert.alert(
          "Partial Success",
          `Bill created but ${errors.length} flats failed and ${preloadErrors.length} preload errors.`
        );
      } else {
        Alert.alert("Success", "New Bill created successfully.", [
          { text: "OK", onPress: () => router.replace("../SpecialBills") },
        ]);
      }
    } catch (err) {
      console.error("Error calling function:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
        <Text>Generating bills... {progress}%</Text>
      </View>
    );
  }

  return (
    <>
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
              <Text>Closed Amount: {item.closedUnitAmount}</Text>
              <Text>Ledger Account: {item.ledgerAccount}</Text>
              <Text>Ledger Group: {item.groupFrom}</Text>
              <Text>Ledger Account updated: {item.updatedLedgerAccount}</Text>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Generate Bill function"
            onPress={callGenerateSpecialBill}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Generate Bill" onPress={handleGenerateBill} />
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 18, fontWeight: "bold", marginVertical: 10 },
  itemContainer: {
    marginVertical: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
  },
  buttonContainer: { marginVertical: 20 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default NextScreenSpecial;
