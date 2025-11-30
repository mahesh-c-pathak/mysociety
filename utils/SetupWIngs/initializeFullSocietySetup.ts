import { collection, doc, writeBatch, deleteDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import {
  ledgerGroupsNameList,
  BankAccountsList,
  CashinHandList,
  IndirectExpensesList,
  IndirectIncomeList,
  AccountReceivableList,
  CurrentLiabilitiesList,
  ReserveandSurplusList,
} from "@/components/LedgerGroupList";

/** Default bill items */
const defaultBillItems = [
  {
    itemName: "Fixed Charges",
    notes: "",
    type: "Fixed Price",
    ownerAmount: 100,
    rentAmount: 100,
    closedUnitAmount: 100,
    updatedAt: "",
    ledgerAccount: "",
    groupFrom: "",
    updatedLedgerAccount: "",
  },
  {
    itemName: "Maintenance based on SQ Feet",
    notes: "",
    type: "Based on Sq Feet",
    ownerAmount: 1,
    rentAmount: 1,
    closedUnitAmount: 1,
    updatedAt: "",
    ledgerAccount: "",
    groupFrom: "",
    updatedLedgerAccount: "",
  },
  {
    itemName: "Cleaning",
    notes: "",
    type: "Fixed Price",
    ownerAmount: 100,
    rentAmount: 100,
    closedUnitAmount: 100,
    updatedAt: "",
    ledgerAccount: "",
    groupFrom: "",
    updatedLedgerAccount: "",
  },
  {
    itemName: "Parking Charges",
    notes: "",
    type: "Fixed Price",
    ownerAmount: 50,
    rentAmount: 50,
    closedUnitAmount: 50,
    updatedAt: "",
    ledgerAccount: "",
    groupFrom: "",
    updatedLedgerAccount: "",
  },
  {
    itemName: "Water Charges",
    notes: "",
    type: "Based on Unit",
    ownerAmount: 5,
    rentAmount: 5,
    closedUnitAmount: 5,
    updatedAt: "",
    ledgerAccount: "",
    groupFrom: "",
    updatedLedgerAccount: "",
  },
];

interface PendingWrite {
  ref: any;
  data: Record<string, any>;
}

/**
 * Commits Firestore writes in chunks of 500 and rolls back on failure
 */
async function commitInChunksWithRollback(writes: PendingWrite[]) {
  const CHUNK_SIZE = 500;
  const committedRefs: any[] = [];

  try {
    for (let i = 0; i < writes.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      const chunk = writes.slice(i, i + CHUNK_SIZE);

      chunk.forEach(({ ref, data }) => {
        batch.set(ref, data);
        committedRefs.push(ref); // Track successfully written refs for rollback
      });

      await batch.commit();
      console.log(`✅ Committed batch chunk ${i / CHUNK_SIZE + 1}`);
    }
  } catch (error) {
    console.error(
      "❌ Error during batch commit. Initiating rollback...",
      error
    );

    // Rollback previously written documents
    for (const ref of committedRefs) {
      try {
        await deleteDoc(ref);
      } catch (rollbackError) {
        console.error(
          "⚠️ Rollback failed for document:",
          ref.path,
          rollbackError
        );
      }
    }

    console.error("🚨 Rollback completed — Firestore is now clean.");
    throw new Error("Batch commit failed and rollback executed.");
  }
}

/**
 * ⚡ Performs full society setup with rollback safety
 */
export const initializeFullSocietySetup = async (
  societyName: string,
  totalWings: number,
  state: string,
  city: string,
  pincode: string,
  address: string,
  societyCode: string,
  adminUid: string,
  customWingNames?: string[] // ✅ Optional new parameter
): Promise<void> => {
  if (!societyName) throw new Error("Society name is required.");

  const now = new Date().toISOString();
  const writes: PendingWrite[] = [];

  // 1️⃣ Society main document
  const societyRef = doc(db, "Societies", societyName);
  writes.push({
    ref: societyRef,
    data: {
      name: societyName,
      totalWings,
      state,
      city,
      pincode,
      address,
      societycode: societyCode,
      admins: [adminUid],
      createdAt: now,
      updatedAt: now,
    },
  });

  // ✅ 2️⃣ Initialize wing structure
  const customWingsSubcollectionName = `${societyName} wings`;

  let wingNames: string[];

  if (customWingNames && customWingNames.length === totalWings) {
    wingNames = customWingNames; // ✅ Use provided names
  } else {
    // fallback to A, B, C...
    wingNames = Array.from({ length: totalWings }, (_, i) =>
      String.fromCharCode(65 + i)
    );
  }

  for (const wingName of wingNames) {
    const wingRef = doc(
      collection(societyRef, customWingsSubcollectionName),
      wingName
    );

    writes.push({
      ref: wingRef,
      data: {
        totalFloors: 0,
        unitsPerFloor: 0,
        format: "",
        createdAt: now,
      },
    });
  }

  // 2️⃣ Ledger groups
  const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`;
  ledgerGroupsNameList.forEach((groupName) => {
    const groupRef = doc(societyRef, ledgerGroupsCollectionName, groupName);
    writes.push({
      ref: groupRef,
      data: { name: groupName },
    });
  });

  // 3️⃣ Ledger accounts & balances
  const addAccounts = (ledgerGroupName: string, accountNames: string[]) => {
    const ledgerGroupRef = doc(
      db,
      "Societies",
      societyName,
      ledgerGroupsCollectionName,
      ledgerGroupName
    );

    const accountsCollectionName = `accounts_${societyName}`;
    const balancesCollectionName = `balances_${societyName}`;
    const currentDate = new Date().toISOString().split("T")[0];

    accountNames.forEach((accountName) => {
      const accountRef = doc(
        collection(ledgerGroupRef, accountsCollectionName),
        accountName
      );
      writes.push({ ref: accountRef, data: { name: accountName } });

      const balanceRef = doc(
        collection(accountRef, balancesCollectionName),
        currentDate
      );
      writes.push({
        ref: balanceRef,
        data: { cumulativeBalance: 0, dailyChange: 0, date: currentDate },
      });
    });
  };

  addAccounts("Bank Accounts", BankAccountsList);
  addAccounts("Cash in Hand", CashinHandList);
  addAccounts("Indirect Expenses", IndirectExpensesList);
  addAccounts("Indirect Income", IndirectIncomeList);
  addAccounts("Account Receivable", AccountReceivableList);
  addAccounts("Current Liabilities", CurrentLiabilitiesList);
  addAccounts("Reserve and Surplus", ReserveandSurplusList);

  // 4️⃣ Default bill items
  const billItemsCollectionName = `specialBillitems_${societyName}`;
  defaultBillItems.forEach((item) => {
    const itemRef = doc(societyRef, billItemsCollectionName, item.itemName);
    writes.push({
      ref: itemRef,
      data: {
        ...item,
        createdAt: now,
        updatedAt: now,
      },
    });
  });

  // 5️⃣ Execute with rollback protection
  await commitInChunksWithRollback(writes);
  console.log(`✅ Full society setup completed safely for '${societyName}'`);
};
