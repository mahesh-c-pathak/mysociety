import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert, Text } from "react-native";
import { Appbar } from "react-native-paper";
import { useRouter } from "expo-router";
import { db } from "@/firebaseConfig";
import { collection, getDocs, doc, setDoc} from "firebase/firestore";
import CustomInput from '@/components/CustomInput';
import CustomButton from '@/components/CustomButton';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Dropdown from "@/utils/DropDown";
import PaymentDatePicker from "@/utils/paymentDate";
import { useSociety } from "@/utils/SocietyContext";

const AddLedgerAccountScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { societyName } = useSociety();
  const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`;
  const accountsCollectionName = `accounts_${societyName}`;
  const balancesCollectionName = `balances_${societyName}`;

  const [name, setName] = useState<string>("");
  const [group, setGroup] = useState<string>("");
  const [ledgerGroups, setLedgerGroups] = useState<
    { label: string; value: string }[]
  >([]);
  const [openingBalance, setOpeningBalance] = useState<string>("0.00");
  const [asOnDate, setAsOnDate] = useState<Date>(new Date());
  const [note, setNote] = useState<string>("");

  const [error, setError] = useState('');

  const router = useRouter();

  // Function to format date as "YYYY-MM-DD"
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };


  // Fetch ledger groups from Firestore
  useEffect(() => {
    const fetchLedgerGroups = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Societies", societyName, ledgerGroupsCollectionName));
        const groups = querySnapshot.docs.map((doc) => ({
          label: doc.id,
          value: doc.data().name,
        }));
        setLedgerGroups(groups);
      } catch (error) {
        console.error("Error fetching ledger groups:", error);
        Alert.alert("Error", "Failed to fetch ledger groups.");
      }
    }; 

    fetchLedgerGroups();
  }, []);

  const handleSave = async () => {
    try {
      if (!name || !group) {
        Alert.alert("Error", "Please fill in all required fields.");
        return;
      }
  
      const selectedGroup = ledgerGroups.find((g) => g.value === group);
      if (!selectedGroup) {
        Alert.alert("Error", "Invalid group selection.");
        return;
      }
  
      const specialGroups = [
        "Current Liabilities",
        "Reserve and Surplus",
        "Direct Income",
        "Indirect Income",
        "Deposit",
        "Capital Account",
        "Account Payable",
        "Provision",
        "Share Capital",
        "Sundry Creditors",
        "Suspense Account",
      ];
  
      // Add to the selected group
      // Reference for the selected group
        const selectedGroupDocRef = doc(db, "Societies", societyName, ledgerGroupsCollectionName, selectedGroup.label);

      // Set the account document with the `name` as the document ID
        const accountDocRef = doc(collection(selectedGroupDocRef, accountsCollectionName), name);
        await setDoc(accountDocRef, { name });

       // Set the balance document with the `asOnDate` (formatted date) as the document ID
        const balanceDocRef = doc(
          collection(accountDocRef, balancesCollectionName),
          formatDate(asOnDate)
        );
        await setDoc(balanceDocRef, {
          date: formatDate(asOnDate),
          dailyChange: parseFloat(openingBalance),
          cumulativeBalance: parseFloat(openingBalance),
        });
      
      // Add to "Account Receivable" group if in specialGroups
    if (specialGroups.includes(group)) {
      const accountReceivableGroup = ledgerGroups.find(
        (g) => g.label === "Account Receivable"
      );
      if (accountReceivableGroup) {
        const accountReceivableDocRef = doc(
          db,
          "Societies", societyName, ledgerGroupsCollectionName,
          accountReceivableGroup.label
        );

        // Add the account to "Account Receivable" group's accounts subcollection
        const receivableAccountDocRef = doc(
          collection(accountReceivableDocRef, accountsCollectionName),
          `${name} Receivable`
        );
        await setDoc(receivableAccountDocRef, { name: `${name} Receivable` });

        // Add a balances subcollection with an initial balance of 0.00
        const receivableBalanceDocRef = doc(
          collection(receivableAccountDocRef, balancesCollectionName),
          formatDate(asOnDate)
        );
        await setDoc(receivableBalanceDocRef, {
          date: formatDate(asOnDate),
          dailyChange: parseFloat(openingBalance),
          cumulativeBalance: parseFloat(openingBalance),
        });
      } else {
        Alert.alert(
          "Error",
          "'Account Receivable' group not found in ledger groups."
        );
        return;
      }
    }
  
      Alert.alert(
        "Success",
        "Ledger account added successfully!",
        [
          {
            text: "OK",
            onPress: () => router.replace("/admin/Accounting/LedgerAccountsScreen"),
          },
        ]
      );
      router.back();
    } catch (error) {
      console.error("Error saving ledger account:", error);
      Alert.alert("Error", "Failed to save ledger account.");
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Top Appbar */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content title="Ledger Accounts" titleStyle={styles.titleStyle} />
      </Appbar.Header> 
      <View style={styles.bodycontainer}>
      {/* Name */}
      <View style={{ width: '100%' }}>
        <CustomInput
          label="Name"
          value={name}
          placeholder="Enter your name"
          onChangeText={setName}
          keyboardType="email-address"
          error={error && !name ? 'Name is required' : ''}
        />
      </View>

        {/* Ledger Group */}
        <View style={styles.section}>
          <Text style={styles.label}> Ledger Group </Text>
          <Dropdown
            data={ledgerGroups}
            onChange={setGroup}
            placeholder="Select Group"
            initialValue={group}
          />
        </View>


       {/* Opening Balance */}
       <View style={{ width: '100%' }}>
        <CustomInput
          label="Opening Balance"
          value={openingBalance}
          placeholder="0,00"
          onChangeText={setOpeningBalance}
          keyboardType="numeric"
        />
        </View>

        {/* As on Date */}
        <View style={styles.section}>
          <Text style={styles.label}>As on Date</Text>
          <PaymentDatePicker
            initialDate={asOnDate}
            onDateChange={setAsOnDate}
          />
        </View>

        {/* Note */}
        <View style={{ width: '100%' }}>
          <CustomInput
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            multiline = {true}
          />
        </View>

        {/* Save Button */}
        <View
        style={[
          styles.footer,
          { bottom: insets.bottom },
        ]}
      >
      <CustomButton onPress={handleSave} />
      </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  bodycontainer: {
    flex: 1,
    padding: 16,
  },
  header: { backgroundColor: "#6200ee" },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  section: { marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  footer: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,   // 👈 ensures it's always visible at bottom
    backgroundColor: "#fff",
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
});

export default AddLedgerAccountScreen;
