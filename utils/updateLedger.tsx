import { collection, doc, runTransaction } from "firebase/firestore";
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

    const accountRef = doc(
      db,
      "Societies",
      societyName,
      ledgerGroupsCollectionName,
      ledgerGroup,
      accountsCollectionName,
      ledgerAccount
    );
    const balancesRef = collection(accountRef, balancesCollectionName);
    const todayRef = doc(balancesRef, date);

    return await runTransaction(db, async (tx) => {
      /* ---------------------------------------------
         1️⃣ READ EVERYTHING FIRST (required by Firestore)
      ----------------------------------------------*/
      const [todaySnap, masterSnap] = await Promise.all([
        tx.get(todayRef),
        tx.get(accountRef),
      ]);

      const oldDaily = todaySnap.exists()
        ? todaySnap.data().dailyChange || 0
        : 0;

      const oldTotal = masterSnap.exists()
        ? masterSnap.data().totalBalance || 0
        : 0;

      const lastUpdatedAt = masterSnap.exists()
        ? masterSnap.data().lastUpdatedAt || null
        : null;

      /* ---------------------------------------------
         2️⃣ Compute new values
      ----------------------------------------------*/
      const change = option === "Add" ? amount : -amount;

      const newDaily = oldDaily + change;

      // delta = difference between final and previous dailyChange
      const delta = newDaily - oldDaily;

      const newTotal = oldTotal + delta;

      /* ---------------------------------------------
         3️⃣ NOW WRITE (ALL reads were already done)
      ----------------------------------------------*/

      // Update daily
      tx.set(todayRef, { date, dailyChange: newDaily }, { merge: true });

      // Update master ledger
      tx.set(
        accountRef,
        {
          totalBalance: newTotal,
          lastUpdatedAt:
            !lastUpdatedAt || date > lastUpdatedAt ? date : lastUpdatedAt,
        },
        { merge: true }
      );

      return "Success";
    });
  } catch (error) {
    console.error("Error updating ledger:", error);
    Alert.alert("Error", "Failed to update ledger.");
    throw error;
  }
};
