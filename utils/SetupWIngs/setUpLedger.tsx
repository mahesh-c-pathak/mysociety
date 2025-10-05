import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { ledgerGroupsNameList, BankAccountsList, CashinHandList, IndirectExpensesList,
   IndirectIncomeList, AccountReceivableList, CurrentLiabilitiesList,
   ReserveandSurplusList,
 } from '@/components/LedgerGroupList';


/**
 * Normalizes the society name by replacing spaces with underscores.
 * @param societyName - Original name of the society.
 * @returns Normalized society name.
 */
 
/**
 * Creates a society document and its ledger groups.
 * @param societyName - Name of the society.
 */
export const addSocietyWithLedgerGroups = async (societyName: string) => {
    try {

        
      // Reference to the Society document
      const societyRef = doc(db, "Societies", societyName);
  
      // Reference to the unique ledgerGroups collection
      const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`;
      const ledgerGroupsRef = collection(societyRef, ledgerGroupsCollectionName);
  
      // Batch write for ledger groups
      const batch = writeBatch(db);
  
      ledgerGroupsNameList.forEach((groupName) => {
        const groupDocRef = doc(ledgerGroupsRef, groupName);
        batch.set(groupDocRef, { name: groupName });
      });
  
      // Commit the batch
      await batch.commit();
      console.log(`Society '${societyName}' and ledger groups created successfully.`);
    } catch (error) {
      console.error("Error adding society and ledger groups:", error);
    }
  };
  
  /**
   * Creates accounts under a ledger group with balances collection.
   * @param societyName - Name of the society.
   * @param ledgerGroupName - Name of the ledger group.
   * @param accountNames - Array of account names.
   */
  export const addAccountsWithBalances = async (
    societyName: string,
    ledgerGroupName: string,
    accountNames: string[]
  ) => {
    try {
        
      // Reference to the unique ledger group
      const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`;
      const ledgerGroupRef = doc(db, "Societies", societyName, ledgerGroupsCollectionName, ledgerGroupName);
  
      // Reference to the unique accounts collection under the ledger group
      const accountsCollectionName = `accounts_${societyName}`;
      const accountsRef = collection(ledgerGroupRef, accountsCollectionName);
  
      // Batch write for accounts and their balances
      const batch = writeBatch(db);
      const currentDate = new Date().toISOString().split("T")[0]; // Current date in YYYY-MM-DD format
  
      accountNames.forEach((accountName) => {
        const accountDocRef = doc(accountsRef, accountName);
  
        // Add account document
        batch.set(accountDocRef, { name: accountName });
  
        // Add unique balances collection with current date document
        const balancesCollectionName = `balances_${societyName}`;
        const balanceDocRef = doc(accountDocRef, balancesCollectionName, currentDate);
        batch.set(balanceDocRef, {
          cumulativeBalance: 0,
          dailyChange: 0,
          date: currentDate,
        });
      });
  
      // Commit the batch
      await batch.commit();
      console.log(`Accounts and balances created successfully under '${ledgerGroupName}'.`);
    } catch (error) {
      console.error("Error adding accounts and balances:", error);
    }
  };
  
  /**
   * Adds accounts from predefined lists to their respective ledger groups with balances.
   * @param societyName - Name of the society.
   */
  export const addPredefinedAccountsWithBalances = async (societyName: string) => {
    try {
      // Add accounts for Bank Accounts ledger group
      if (BankAccountsList.length > 0) {
        await addAccountsWithBalances(societyName, "Bank Accounts", BankAccountsList);
        console.log(`Bank Accounts added successfully for '${societyName}'.`);
      }
  
      // Add accounts for Cash in Hand ledger group
      if (CashinHandList.length > 0) {
        await addAccountsWithBalances(societyName, "Cash in Hand", CashinHandList);
        console.log(`Cash in Hand accounts added successfully for '${societyName}'.`);
      }
  
      // Add accounts for Indirect Expenses ledger group
      if (IndirectExpensesList.length > 0) {
        await addAccountsWithBalances(societyName, "Indirect Expenses", IndirectExpensesList);
        console.log(`Indirect Expenses accounts added successfully for '${societyName}'.`);
      }
  
      // Add accounts for Indirect Income ledger group
      if (IndirectIncomeList.length > 0) {
        await addAccountsWithBalances(societyName, "Indirect Income", IndirectIncomeList);
        console.log(`Indirect Income accounts added successfully for '${societyName}'.`);
      }

      // Add accounts for Account Receivable ledger group
      if (AccountReceivableList.length > 0) {
        await addAccountsWithBalances(societyName, "Account Receivable", AccountReceivableList);
        console.log(`Account Receivable accounts added successfully for '${societyName}'.`);
      }

      // Add accounts for Current Liabilities ledger group
      if (CurrentLiabilitiesList.length > 0) {
        await addAccountsWithBalances(societyName, "Current Liabilities", CurrentLiabilitiesList);
        console.log(`Current Liabilities accounts added successfully for '${societyName}'.`);
      }

      // Add accounts for Reserve and Surplus ledger group
      if (ReserveandSurplusList.length > 0) {
        await addAccountsWithBalances(societyName, "Reserve and Surplus", ReserveandSurplusList);
        console.log(`Reserve and Surplusaccounts added successfully for '${societyName}'.`);
      }


    } catch (error) {
      console.error("Error adding predefined accounts and balances:", error);
    }
  };
  