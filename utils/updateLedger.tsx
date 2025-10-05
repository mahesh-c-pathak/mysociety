import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { Alert } from "react-native";


export const updateLedger = async (
  societyName: string,
  ledgerGroup: string,
  ledgerAccount: string,
  amount: number,
  option: "Add" | "Subtract", // Accept only "Add" or "Subtract"
  date: string // Date in "YYYY-MM-DD" format
): Promise<string> => {
  try {
    
    // Define dynamic collection names
    const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`; // Updated collection name
    const accountsCollectionName = `accounts_${societyName}`; // Updated collection name
    const balancesCollectionName = `balances_${societyName}`; // Updated collection name

    const updateLedgerPromises: Promise<void>[] = [];

    // Reference to the balances subcollection
    const balancesCollectionRef = collection(
      db,
      "Societies", 
      societyName,
      ledgerGroupsCollectionName,
      ledgerGroup,
      accountsCollectionName,
      ledgerAccount,
      balancesCollectionName
    );

    // Check if a balance document exists for the given date
    const balanceDocRef = doc(balancesCollectionRef, date);
    const balanceDocSnapshot = await getDoc(balanceDocRef);

    let previousDailyChange = 0;
    let previousCumulativeBalance = 0;

    if (balanceDocSnapshot.exists()) {
      // If a balance document exists, get the current values
      previousDailyChange = balanceDocSnapshot.data()?.dailyChange || 0;
      previousCumulativeBalance =
        balanceDocSnapshot.data()?.cumulativeBalance || 0;
    }

    // Retrieve all balances ordered by date
    const balancesQuery = query(balancesCollectionRef, orderBy("date"));
    const balancesSnapshot = await getDocs(balancesQuery);

    // Find the most recent prior cumulative balance
    let priorCumulativeBalance = 0;

    balancesSnapshot.forEach((docSnapshot) => {
      const balanceDate = docSnapshot.id;
      if (balanceDate < date) {
        priorCumulativeBalance = docSnapshot.data()?.cumulativeBalance || 0;
      }
    });

    // Calculate the new dailyChange
    const newDailyChange =
      option === "Add"
        ? previousDailyChange + amount
        : previousDailyChange - amount;

    // Calculate the new cumulative balance based on the prior date
    const newCumulativeBalance = priorCumulativeBalance + newDailyChange;

    // Update or create the balance document for the given date
    updateLedgerPromises.push(
      setDoc(
        balanceDocRef,
        {
          date,
          dailyChange: newDailyChange,
          cumulativeBalance: newCumulativeBalance,
        },
        { merge: true }
      )
    );

    // Recalculate cumulative balances for subsequent dates
    let carryForwardBalance = newCumulativeBalance;

    balancesSnapshot.forEach((docSnapshot) => {
      const balanceDate = docSnapshot.id;
      if (balanceDate > date) {
        const balanceData = docSnapshot.data();
        const updatedCumulativeBalance =
          carryForwardBalance + (balanceData.dailyChange || 0);

        carryForwardBalance = updatedCumulativeBalance;

        updateLedgerPromises.push(
          updateDoc(doc(balancesCollectionRef, balanceDate), {
            cumulativeBalance: updatedCumulativeBalance,
          })
        );
      }
    });

    // Wait for all updates to complete
    await Promise.all(updateLedgerPromises);

    return "Success";
  } catch (error) {
    console.error("Error updating ledger:", error);
    Alert.alert("Error", "Failed to update ledger.");
    throw error;
  }
};
