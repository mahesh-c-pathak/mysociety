import { collection, addDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";

/** ✅ Type definition for a bill item */
export interface BillItem {
  itemName: string;
  notes: string;
  type: string;
  ownerAmount: number;
  rentAmount: number;
  closedUnitAmount: number;
  updatedAt: string;
  ledgerAccount: string;
  groupFrom: string;
  updatedLedgerAccount: string;
}

/** ✅ Predefined default bill items */
const defaultBillItems: BillItem[] = [
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

/**
 * Saves the predefined array of bill items to Firestore.
 *
 * @param societyName - The name of the society (used for Firestore path)
 * @returns Promise<void>
 */
export const saveBillItemsArrayToFirestore = async (
  societyName: string
): Promise<void> => {
  if (!societyName) throw new Error("Society name is required.");

  const specialBillitemCollectionName = `specialBillitems_${societyName}`;
  const collectionRef = collection(
    db,
    "Societies",
    societyName,
    specialBillitemCollectionName
  );

  try {
    const promises = defaultBillItems.map(async (item) => {
      const newItem = {
        ...item,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collectionRef, newItem);
    });

    await Promise.all(promises);
    console.log("✅ All default bill items saved successfully!");
  } catch (error) {
    console.error("❌ Error saving default bill items:", error);
    throw error;
  }
};
