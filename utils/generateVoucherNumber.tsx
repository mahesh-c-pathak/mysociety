import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { Alert } from "react-native";

 
export const GenerateVoucherNumber = async (societyName: string): Promise<string> => {
    
    try {
        
        const counterRef = doc(db,"Societies", societyName, "Meta", "transactionCounter");
        const counterDoc = await getDoc(counterRef);

        let count = 1;
        if (counterDoc.exists()) {
            count = counterDoc.data().count + 1;
        }

        
        // ✅ setDoc will create the document if it doesn't exist
        await setDoc(counterRef, { count }, { merge: true });

        // 🔥 Generate financial year string dynamically
        const currentYear = new Date().getFullYear();
        const nextYear = (currentYear + 1).toString().slice(-2); // last 2 digits
        const financialYear = `${currentYear}-${nextYear}`;

        // Format the voucher number
        return `V/${financialYear}/${count}`;
    } catch (error) {
        console.error("Error generating voucher number:", error);
        Alert.alert("Error", "Failed to generate voucher number.");
        throw error;
    }
};


