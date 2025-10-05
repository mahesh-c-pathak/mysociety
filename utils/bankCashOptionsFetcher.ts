import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";


interface AccountOption {
  label: string;
  value: string;
  group: string;
}

export const fetchbankCashAccountOptions = async (societyName: string) => {
  try {
    
    // Update collection names
    const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`; // Updated collection name
    const accountsCollectionName = `accounts_${societyName}`; // Updated collection name

    // Reference to ledger groups
    const ledgerGroupsRef = collection(db,"Societies", societyName, ledgerGroupsCollectionName); // Updated collection name

    // Fetch Bank Accounts and Cash in Hand accounts
    const fromQuerySnapshot = await getDocs(
      query(ledgerGroupsRef, where("name", "in", ["Bank Accounts", "Cash in Hand"]))
    );

    const accountFromOptions: AccountOption[] = [];

    for (const doc of fromQuerySnapshot.docs) {
      const groupName = doc.data().name; // Get the group name

      // Reference to accounts
      const accountsRef = collection(doc.ref, accountsCollectionName); // Updated collection name
      const accountsSnapshot = await getDocs(accountsRef);

      accountsSnapshot.forEach((accountDoc) => {
        const accountData = accountDoc.data();
        accountFromOptions.push({
          label: accountData.name,
          value: accountData.name,
          group: groupName, // Include the group name
        });
      });
    }

    // Fetch only Bank Accounts
    const bankAccountsSnapshot = await getDocs(
      query(ledgerGroupsRef, where("name", "==", "Bank Accounts"))
    );
    const bankAccountOptions: AccountOption[] = [];
    for (const doc of bankAccountsSnapshot.docs) {
      const groupName = doc.data().name; // Get the group name

      // Reference to accounts
      const accountsRef = collection(doc.ref, accountsCollectionName); // Updated collection name
      const accountsSnapshot = await getDocs(accountsRef);

      accountsSnapshot.forEach((accountDoc) => {
        const accountData = accountDoc.data();
        bankAccountOptions.push({
          label: accountData.name,
          value: accountData.name,
          group: groupName, // Include the group name
        });
      });
    }

    // Fetch only Cash Accounts
    const cashAccountsSnapshot = await getDocs(
      query(ledgerGroupsRef, where("name", "==", "Cash in Hand"))
    );
    const cashAccountOptions: AccountOption[] = [];
    for (const doc of cashAccountsSnapshot.docs) {
      const groupName = doc.data().name; // Get the group name

      // Reference to accounts
      const accountsRef = collection(doc.ref, accountsCollectionName); // Updated collection name
      const accountsSnapshot = await getDocs(accountsRef);

      accountsSnapshot.forEach((accountDoc) => {
        const accountData = accountDoc.data();
        cashAccountOptions.push({
          label: accountData.name,
          value: accountData.name,
          group: groupName, // Include the group name
        });
      });
    }

    return { accountFromOptions, bankAccountOptions, cashAccountOptions };
  } catch (error) {
    console.error("Error fetching account options:", error);
    throw new Error("Failed to fetch account options.");
  }
};
