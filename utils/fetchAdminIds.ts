// utils/fetchAdminIds.ts
import { db } from "@/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

/**
 * Fetches the list of admin user IDs for a given society.
 *
 * @param societyName - The name of the society (document ID in Firestore)
 * @returns A Promise that resolves to an array of admin user IDs
 */
export const fetchAdminIds = async (societyName: string): Promise<string[]> => {
  try {
    if (!societyName) {
      console.warn("⚠️ fetchAdminIds called without a societyName");
      return [];
    }

    const societyRef = doc(db, "Societies", societyName);
    const societySnap = await getDoc(societyRef);

    if (!societySnap.exists()) {
      console.warn(`⚠️ Society document not found for: ${societyName}`);
      return [];
    }

    const data = societySnap.data();
    return Array.isArray(data.admins) ? data.admins : [];
  } catch (error) {
    console.error("❌ Error fetching admin IDs:", error);
    return [];
  }
};
