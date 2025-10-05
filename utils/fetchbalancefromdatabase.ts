import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from "@/firebaseConfig";

    // Get Opening Balances for bank and Cash - function to fetch balance on or before a specific date
    export const fetchLatestBalanceBeforeDate = async (societyName: string, groupId: string, accountId: string, date: string) => {
      const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`;
      const accountsCollectionName = `accounts_${societyName}`;
      const balancesCollectionName = `balances_${societyName}`;
            const balancesCollection = collection(db, "Societies", societyName, ledgerGroupsCollectionName, groupId, accountsCollectionName, accountId, balancesCollectionName);
            const q = query(balancesCollection, where("date", "<=", date), orderBy("date", "desc"), limit(1));
            const snapshot = await getDocs(q);
        
            if (!snapshot.empty) {
              const data = snapshot.docs[0].data();
              return data.cumulativeBalance ?? 0; // Use cumulativeBalance or default to 0
            }
            return 0; // Default to 0 if no balance is found
          };

    // function to fetch balance for a specific date

    export const fetchBalanceForDate = async (societyName: string, groupId: string, accountId: string, date: string): Promise<number> => {
            try {
              const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`;
              const accountsCollectionName = `accounts_${societyName}`;
              const balancesCollectionName = `balances_${societyName}`;
              
              const balancesCollection = collection(db, "Societies", societyName, ledgerGroupsCollectionName, groupId, accountsCollectionName, accountId, balancesCollectionName);
              const q = query(balancesCollection, where("date", "==", date));
              const snapshot = await getDocs(q);
          
              if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                return data.cumulativeBalance ?? 0; // Use cumulativeBalance or default to 0
              }
          
              return 0; // Default to 0 if no balance is found
            } catch (error) {
              console.error("Error fetching balance for date:", error);
              throw new Error("Failed to fetch balance for the specified date");
            }
          };