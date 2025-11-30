import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";

// Get Opening Balances for bank and Cash - function to fetch balance on or before a specific date
export const fetchLatestBalanceBeforeDate = async (
  societyName: string,
  groupId: string,
  accountId: string,
  date: string
) => {
  const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`;
  const accountsCollectionName = `accounts_${societyName}`;
  const balancesCollectionName = `balances_${societyName}`;

  const accountRef = doc(
    db,
    "Societies",
    societyName,
    ledgerGroupsCollectionName,
    groupId,
    accountsCollectionName,
    accountId
  );

  const dailyCollection = collection(accountRef, balancesCollectionName);

  const masterSnap = await getDoc(accountRef);
  const masterTotal = masterSnap.exists()
    ? masterSnap.data().totalBalance || 0
    : 0;

  // All dates AFTER given date
  const q = query(dailyCollection, where("date", ">", date));

  const snaps = await getDocs(q);

  let futureSum = 0;
  snaps.forEach((doc) => {
    futureSum += doc.data().dailyChange || 0;
  });

  // Opening balance = masterTotal - all future deltas
  return masterTotal - futureSum;
};

// function to fetch balance for a specific date
/**
 * Fetch balance for a specific YYYY-MM-DD date
 * Following the new updateLedger logic.
 */

export const fetchBalanceForDate = async (
  societyName: string,
  groupId: string,
  accountId: string,
  date: string
): Promise<number> => {
  try {
    const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`;
    const accountsCollectionName = `accounts_${societyName}`;
    const balancesCollectionName = `balances_${societyName}`;

    const accountRef = doc(
      db,
      "Societies",
      societyName,
      ledgerGroupsCollectionName,
      groupId,
      accountsCollectionName,
      accountId
    );

    const dailyCollection = collection(accountRef, balancesCollectionName);

    // Read master ledger balance
    const masterSnap = await getDoc(accountRef);
    const masterTotal = masterSnap.exists()
      ? masterSnap.data().totalBalance || 0
      : 0;

    // If querying for today's date, just return master
    const today = masterSnap.exists()
      ? masterSnap.data().lastUpdatedAt || null
      : null;

    if (today <= date) {
      return masterTotal;
    }

    // Get all future entries > date
    const q = query(dailyCollection, where("date", ">", date));

    const futureSnaps = await getDocs(q);

    let sumFutureDeltas = 0;
    futureSnaps.forEach((doc) => {
      sumFutureDeltas += doc.data().dailyChange || 0;
    });

    // Balance on date = masterTotal minus future deltas
    return masterTotal - sumFutureDeltas;
  } catch (error) {
    console.error("Error fetching balance for date:", error);
    throw new Error("Failed to fetch balance for the specified date");
  }
};
