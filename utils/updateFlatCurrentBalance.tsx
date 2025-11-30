import { db } from "@/firebaseConfig";
import { doc, runTransaction, increment } from "firebase/firestore";
import { Alert } from "react-native";

export const updateFlatCurrentBalance = async (
  currentbalanceCollectionRef: any,
  amount: number,
  option: "Add" | "Subtract",
  date: string,
  societyName: string
): Promise<string> => {
  try {
    const segments = currentbalanceCollectionRef.path.split("/");

    const customWings = `${societyName} wings`;
    const customFloors = `${societyName} floors`;
    const customFlats = `${societyName} flats`;

    const wing = segments[3];
    const floor = segments[5];
    const flatNumber = segments[7];

    const flatDocRef = doc(
      db,
      "Societies",
      societyName,
      customWings,
      wing,
      customFloors,
      floor,
      customFlats,
      flatNumber
    );

    const todayDocRef = doc(currentbalanceCollectionRef, date);

    await runTransaction(db, async (transaction) => {
      /* -----------------------------------
         1️⃣ READ ALL DOCS FIRST (required)
      ------------------------------------*/
      const [todaySnap, flatSnap] = await Promise.all([
        transaction.get(todayDocRef),
        transaction.get(flatDocRef),
      ]);

      const previousDaily = todaySnap.exists()
        ? todaySnap.data().dailyChange || 0
        : 0;

      const newDaily =
        option === "Add" ? previousDaily + amount : previousDaily - amount;

      const delta = option === "Add" ? amount : -amount;

      const lastUpdated = flatSnap.exists()
        ? flatSnap.data().lastUpdatedAt
        : null;

      /* -----------------------------------
         2️⃣ NOW WRITE (all reads are done)
      ------------------------------------*/

      // update today doc
      transaction.set(
        todayDocRef,
        { dailyChange: newDaily, date },
        { merge: true }
      );

      // update flat master record
      transaction.set(
        flatDocRef,
        {
          totalBalance: increment(delta),
          lastUpdatedAt:
            !lastUpdated || date > lastUpdated ? date : lastUpdated,
        },
        { merge: true }
      );
    });

    return "Success";
  } catch (error) {
    console.error("Error updating balance:", error);
    Alert.alert("Error", "Failed to update balance.");
    throw error;
  }
};
