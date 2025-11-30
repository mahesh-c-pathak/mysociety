import { db } from "@/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

/**
 * Fetch the current balance for a flat.
 * Now using the master totalBalance stored in the flat document.
 *
 * @param flatDocPath Full Firestore path of the flat document
 * @param societyName Not used anymore (kept for compatibility)
 * @param flatNumber Not used anymore (kept for compatibility)
 * @returns Promise<number>
 */
export const getFlatCurrentBalance = async (
  flatDocPath: string,
  societyName?: string,
  flatNumber?: string
): Promise<number> => {
  try {
    const flatDocRef = doc(db, flatDocPath);

    const snap = await getDoc(flatDocRef);
    if (snap.exists()) {
      const data = snap.data();
      return data.totalBalance || 0;
    }

    return 0;
  } catch (error) {
    console.error("Error fetching current balance:", error);
    return 0;
  }
};
