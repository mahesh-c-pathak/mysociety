import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { TextInput, Button, Menu, Provider } from "react-native-paper";
import { collection, doc, getDoc, getDocs, query, where, addDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppbarComponent from '../../../../components/AppbarComponent';

import { billItemLedgerGroupList } from '../../../../components/LedgerGroupList'; // Import the array
import { fetchAccountList } from "../../../../utils/acountFetcher";
import Dropdown from "../../../../utils/DropDown";

import { useSociety } from "@/utils/SocietyContext";

const AddSpecialBillItem = () => {
  const { societyName } = useSociety();
  const [itemName, setItemName] = useState("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState("");
  const [ownerAmount, setOwnerAmount] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [closedUnitAmount, setClosedUnitAmount] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
 
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const [accountFromOptions, setAccountFromOptions] = useState<{ label: string; value: string; group: string }[]>([]);

  const [ledgerAccount, setLedgerAccount] = useState<string>("");
  const [groupFrom, setGroupFrom] = useState<string>("");

  const specialBillitemCollectionName = `specialBillitems_${societyName}`; 

  // Prefill form in update mode
  useEffect(() => {
    const fetchBillItemsDetails = async () => {
      if (params?.id) {
        setIsEditMode(true);
        try {
          const billItemsRef = doc(db, "Societies", societyName, specialBillitemCollectionName, params.id as string);
          const billItemsRefDoc = await getDoc(billItemsRef);

          if (billItemsRefDoc.exists()) {
            const billItemsData = billItemsRefDoc.data();
            setItemName(billItemsData.itemName || "");
            setNotes(billItemsData.notes || "");
            setType(billItemsData.type || "Select");
            setOwnerAmount(billItemsData.ownerAmount ? billItemsData.ownerAmount.toString() : "");
            setRentAmount(billItemsData.rentAmount ? billItemsData.rentAmount.toString() : "");
            setClosedUnitAmount(billItemsData.closedUnitAmount ? billItemsData.closedUnitAmount.toString() : "");
          } else {
            Alert.alert("Error", "Transaction not found.");
          }
        } catch (error) {
          console.error("Error fetching transaction details:", error);
          Alert.alert("Error", "Failed to fetch transaction details.");
        }
      }
    };
    const fetchAccountOptions = async () => {
        try {
            const ledgerGroupsRef = collection(db, "ledgerGroups");
    
            const fromQuerySnapshot = await getDocs(
              query(ledgerGroupsRef, 
                where("name", "in", [
                    "Indirect Income", 
                    "Current Liabilities",
                    "Reserve and Surplus",
                    "Deposit",
                    "Direct Income",
                    "Capital Account",
                    "Account Payable",
                    "Provision",
                    "Share Capital",
                    "Sundry Creditors",
                    "Suspense Account",
                ]))
            ); 
            const fromAccounts = fromQuerySnapshot.docs
              .map((doc) => doc.data().accounts || [])
              .flat()
              .filter((account) => account.trim() !== "")
              .sort((a, b) => a.localeCompare(b)); // Sort alphabetically
            setAccountFromOptions(fromAccounts);
        } catch (error) {
            console.error("Error fetching account options:", error);
            Alert.alert("Error", "Failed to fetch account options.");
          }
    };


    fetchBillItemsDetails();
    fetchAccountOptions();
  }, [params.id, societyName, specialBillitemCollectionName]);

  // fetch Paid To List
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const { accountOptions } = await fetchAccountList(societyName,billItemLedgerGroupList);
        setAccountFromOptions(accountOptions);
      } catch (error: any) {
  Alert.alert(
    "Error",
    error?.message ?? "Failed to fetch account options."
  );
}

    };
    fetchOptions();
  }, [params.id, societyName]);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const saveItem = async () => {
    const updatedLedgerAccount = `${ledgerAccount} Receivables`;
    const newBillItem = {
      itemName,
      notes,
      type,
      ownerAmount: parseFloat(ownerAmount) || 0,
      rentAmount: parseFloat(rentAmount) || 0,
      closedUnitAmount: parseFloat(closedUnitAmount) || 0,
      updatedAt: new Date().toISOString(),
      ledgerAccount: ledgerAccount,
      groupFrom: groupFrom,
      updatedLedgerAccount, // Add updatedLedgerAccount here
    };

    try {
      if (isEditMode) {
        if (!ledgerAccount) {
            Alert.alert("Update Bill Item ", "Please Select Ledger Account.");
            return;
        }
        

        // Fetch existing items from AsyncStorage
            const existingItemsString = await AsyncStorage.getItem("@createdBillItem");
            const existingItems = existingItemsString ? JSON.parse(existingItemsString) : [];

        // Ensure the existing data is an array
            if (!Array.isArray(existingItems)) {
            throw new Error("Corrupted data in AsyncStorage.");
            }

            // Append the new item
            const updatedBillItem = { ...newBillItem, id: `${Date.now()}-${Math.random()}` };
            const updatedItems = [...existingItems, updatedBillItem];

            // Save back to AsyncStorage
            await AsyncStorage.setItem("@createdBillItem", JSON.stringify(updatedItems));
        


        Alert.alert("Success", "Bill item updated successfully!", [
          { text: "OK", onPress: () => router.push({
            pathname: "./CreateSpecialBill", // Adjust this path based on your routing structure
            params: {
                id: params.id, // Pass the document ID
                ...newBillItem, // Pass the full item data
              },
          }) },
        ]);
         
      } else {
        await addDoc(collection(db, "Societies", societyName, specialBillitemCollectionName ), {  
          ...newBillItem,
          createdAt: new Date().toISOString(),
        });
        Alert.alert("Success", "Bill item added successfully!", [
          { text: "OK", onPress: () => router.replace("./specialBillitems") },
        ]);
      }
    } catch (error) {
      console.error("Error saving/updating document: ", error);
      Alert.alert("Error", "Failed to save or update bill item.");
    }
  };


  return (
    <Provider>
      <View style={styles.container}>
        {/* Top Appbar */}
    <AppbarComponent
        title= {isEditMode ? "Update Bill Item" : "Add Bill Item"} 
        source="Admin"
      />
        <KeyboardAvoidingView
          style={styles.form}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TextInput
            label="Item Name"
            value={itemName}
            onChangeText={setItemName}
            style={styles.input}
            mode="outlined"
          />
          <TextInput
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            style={styles.input}
            mode="outlined"
            multiline
          />
          {isEditMode && (
              <View style={styles.section}>
                <Text style={styles.label}>Paid From</Text>
                <Dropdown
                  data={accountFromOptions.map((option) => ({
                    label: option.label,
                    value: option.value,
                  }))}
                  onChange={(selectedValue) => {
                    setLedgerAccount(selectedValue);

                    // Find the selected account to get its group
                    const selectedOption = accountFromOptions.find(
                      (option) => option.value === selectedValue
                    );
                    if (selectedOption) {
                      setGroupFrom(selectedOption.group); // Set the group name
                      console.log("Selected Group:", selectedOption.group);
                    }
                    
                  }}
                  placeholder="Select Account"
                  initialValue={ledgerAccount}
                />

              </View>           
            )}
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <TextInput
                label="Type"
                value={type}
                style={styles.input}
                mode="outlined"
                editable={false}
                right={<TextInput.Icon icon="chevron-down" onPress={openMenu} />}
              />
            }
          >
            <Menu.Item onPress={() => { setType("Fixed Price"); closeMenu(); }} title="Fixed Price" />
            <Menu.Item onPress={() => { setType("Based on Unit"); closeMenu(); }} title="Based on Unit" />
            <Menu.Item onPress={() => { setType("Based on Sq Feet"); closeMenu(); }} title="Based on Sq Feet" />
          </Menu>

          {type !== "Select" && (
            <View style={styles.fixedPriceInputs}>
              <TextInput
                label="For owner (self occupied)"
                value={ownerAmount}
                onChangeText={setOwnerAmount}
                style={styles.input}
                mode="outlined"
                keyboardType="numeric"
              />
              <TextInput
                label="For rent"
                value={rentAmount}
                onChangeText={setRentAmount}
                style={styles.input}
                mode="outlined"
                keyboardType="numeric"
              />
              <TextInput
                label="For closed unit"
                value={closedUnitAmount}
                onChangeText={setClosedUnitAmount}
                style={styles.input}
                mode="outlined"
                keyboardType="numeric"
              />
            </View>
          )}

          <Button mode="contained" onPress={saveItem} style={styles.saveButton}>
            {isEditMode ? "Update" : "Save"}
          </Button>
        </KeyboardAvoidingView>
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF",},
  form: {
    flex: 1,
    padding: 20,
  },
  input: {
    marginBottom: 10,
  },
  fixedPriceInputs: {
    marginTop: 20,
  },
  saveButton: {
    marginTop: 20,
  },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  section: { marginBottom: 10 },
});

export default AddSpecialBillItem;
