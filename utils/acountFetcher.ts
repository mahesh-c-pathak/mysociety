import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";


interface AccountOption {
  label: string;
  value: string;
  group: string;
}

export const fetchAccountList = async (societyName: string,groupNames: string[]) => {
  try {
    
    // Update collection name
    const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`; // Updated collection name
    const accountsCollectionName = `accounts_${societyName}`; // Updated collection name

    

    // Reference to ledger groups
    const ledgerGroupsRef = collection(db, "Societies", societyName, ledgerGroupsCollectionName); // Updated collection name

    // Fetch accounts for the specified groups
    const fromQuerySnapshot = await getDocs(
      query(ledgerGroupsRef, where("name", "in", groupNames))
    );

    const accountOptions: AccountOption[] = [];

    for (const doc of fromQuerySnapshot.docs) {
      const groupName = doc.data().name; // Get the group name

      // Reference to accounts
      const accountsRef = collection(doc.ref, accountsCollectionName); // Updated collection name
      const accountsSnapshot = await getDocs(accountsRef);

      accountsSnapshot.forEach((accountDoc) => {
        const accountData = accountDoc.data();
        accountOptions.push({
          label: accountData.name,
          value: accountData.name,
          group: groupName, // Include the group name
        });
        // Sort account options alphabetically by value
        accountOptions.sort((a, b) => a.value.localeCompare(b.value));
      });
    }

    return { accountOptions };
  } catch (error) {
    console.error("Error fetching account options:", error);
    throw new Error("Failed to fetch account options.");
  }
};
