import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

import { collection, getDocs } from "firebase/firestore";


import { db } from "@/firebaseConfig";
import { useAuthRole } from "@/lib/authRole";

interface SocietyContextProps {
  societyName: string;
  setSocietyName: (name: string) => void;
  wing: string;
  floorName: string;
  flatNumber: string;
  userType: string;
  setWing: (wing: string) => void;
  setFloorName: (floorName: string) => void;
  setFlatNumber: (flatNumber: string) => void;
  setUserType: (userType: string) => void;
  assetAccounts: string[];
  liabilityAccounts: string[];
  incomeAccounts: string[];
  expenditureAccounts: string[];
  fetchFinancialData: () => Promise<void>;
}

const SocietyContext = createContext<SocietyContextProps | undefined>(
  undefined
);

export const useSociety = () => {
  const context = useContext(SocietyContext);
  if (!context) {
    throw new Error("useSociety must be used within a SocietyProvider");
  }
  return context;
};

export const SocietyProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuthRole();
  const [societyName, setSocietyName] = useState<string>("");
  const [wing, setWing] = useState<string>("");
  const [floorName, setFloorName] = useState<string>("");
  const [flatNumber, setFlatNumber] = useState<string>("");
  const [userType, setUserType] = useState<string>("");
  const [assetAccounts, setAssetAccounts] = useState<string[]>([]);
  const [liabilityAccounts, setLiabilityAccounts] = useState<string[]>([]);
  const [incomeAccounts, setIncomeAccounts] = useState<string[]>([]);
  const [expenditureAccounts, setExpenditureAccounts] = useState<string[]>([]);
  const liabilityCategories = [
    "Account Payable",
    "Capital Account",
    "Current Liabilities",
    "Deposit",
    "Loan and Advances",
    "Provision",
    "Reserve and Surplus",
    "Share Capital",
    "Sundry Creditors",
    "Suspense Account",
    "Income & Expenditure Account",
  ];

  const assetCategories = [
    "Account Receivable",
    "Bank Accounts",
    "Cash in Hand",
    "Current Assets",
    "Fixed Assets",
    "Investment",
    "Sundry Debtors",
  ];

  const incomeCategories = ["Direct Income", "Indirect Income"];

  const expenditureCategories = [
    "Direct Expenses",
    "Indirect Expenses",
    "Maintenance & Repairing",
  ];

  const fetchFinancialData = async () => {
    try {
      if (!isAuthenticated) return; // Ensure user is authenticated before fetching
      const querySnapshot = await getDocs(collection(db, "ledgerGroupsNew"));
      const ledgerGroups: { name: string; accounts: string[] }[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const accounts = Object.keys(data).filter((key) => key.trim() !== ""); // Get only non-empty account names
        ledgerGroups.push({ name: doc.id, accounts });
      });

      const liabilities = ledgerGroups
        .filter((group) => liabilityCategories.includes(group.name))
        .flatMap((group) => group.accounts);

      const assets = ledgerGroups
        .filter((group) => assetCategories.includes(group.name))
        .flatMap((group) => group.accounts);

      const income = ledgerGroups
        .filter((group) => incomeCategories.includes(group.name))
        .flatMap((group) => group.accounts);

      const expenditure = ledgerGroups
        .filter((group) => expenditureCategories.includes(group.name))
        .flatMap((group) => group.accounts);

      setLiabilityAccounts(liabilities);
      setAssetAccounts(assets);
      setIncomeAccounts(income);
      setExpenditureAccounts(expenditure);
    } catch (error) {
      console.error("Error fetching financial data:", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchFinancialData();
    }
  }, [isAuthenticated]);

  // Prevent rendering context if authentication is still being determined
  if (typeof isAuthenticated === "undefined") {
    return null; // Show nothing until authentication is confirmed
  }

  return (
    <SocietyContext.Provider
      value={{
        societyName,
        wing,
        floorName,
        flatNumber,
        userType,
        setSocietyName,
        setWing,
        setFloorName,
        setFlatNumber,
        setUserType,
        assetAccounts,
        liabilityAccounts,
        incomeAccounts,
        expenditureAccounts,
        fetchFinancialData,
      }}
    >
      {children}
    </SocietyContext.Provider>
  );
};
