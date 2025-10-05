import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    orderBy,
    setDoc,
    updateDoc,
  } from "firebase/firestore";
  import { Alert } from "react-native";
  
  interface BalanceData {
    dailyChange: number;
    cumulativeBalance: number;
  }
  
  export const updateFlatCurrentBalance = async (
    currentbalanceCollectionRef: any, // Firestore collection reference
    amount: number,
    option: "Add" | "Subtract",
    date: string
  ): Promise<string> => {
    try {
      const balanceDocRef = doc(currentbalanceCollectionRef, date);
      const balanceDocSnapshot = await getDoc(balanceDocRef);
  
      let previousDailyChange = 0;
      let previousCumulativeBalance = 0;
  
      if (balanceDocSnapshot.exists()) {
        const balanceData = balanceDocSnapshot.data() as BalanceData;
        previousDailyChange = balanceData.dailyChange || 0;
        previousCumulativeBalance = balanceData.cumulativeBalance || 0;
      }
  
      // Retrieve all balances ordered by date
      const balancesQuery = query(currentbalanceCollectionRef, orderBy("date"));
      const balancesSnapshot = await getDocs(balancesQuery);
  
      // Find the most recent prior cumulative balance
      let priorCumulativeBalance = 0;
  
      balancesSnapshot.forEach((docSnapshot) => {
        const balanceDate = docSnapshot.id;
        if (balanceDate < date) {
          const balanceData = docSnapshot.data() as BalanceData;
          priorCumulativeBalance = balanceData.cumulativeBalance || 0;
        }
      });
  
      // Calculate the new daily change
      const newDailyChange =
        option === "Add"
          ? previousDailyChange + amount
          : previousDailyChange - amount;
  
      // Calculate the new cumulative balance based on the prior date
      const newCumulativeBalance = priorCumulativeBalance + newDailyChange;
  
      // Update or create the balance document for the given date
      await setDoc(
        balanceDocRef,
        {
          date,
          dailyChange: newDailyChange,
          cumulativeBalance: newCumulativeBalance,
        },
        { merge: true }
      );
  
      // Recalculate cumulative balances for subsequent dates
      let carryForwardBalance = newCumulativeBalance;
  
      const updatePromises: Promise<void>[] = [];
  
      balancesSnapshot.forEach((docSnapshot) => {
        const balanceDate = docSnapshot.id;
        if (balanceDate > date) {
          const balanceData = docSnapshot.data() as BalanceData;
          const updatedCumulativeBalance =
            carryForwardBalance + (balanceData.dailyChange || 0);
  
          carryForwardBalance = updatedCumulativeBalance;
  
          updatePromises.push(
            updateDoc(doc(currentbalanceCollectionRef, balanceDate), {
              cumulativeBalance: updatedCumulativeBalance,
            })
          );
        }
      });
  
      // Wait for all updates to complete
      await Promise.all(updatePromises);
  
      return "Success";
    } catch (error) {
      console.error("Error updating balance:", error);
      Alert.alert("Error", "Failed to update balance.");
      throw error;
    }
  };
  