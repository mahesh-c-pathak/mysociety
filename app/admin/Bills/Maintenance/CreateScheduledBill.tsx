import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppbarComponent from "@/components/AppbarComponent"; // Adjust the path as per your structure

import DropdownMultiSelect from "@/utils/DropdownMultiSelect";

import CustomInput from "@/components/CustomInput";
import Dropdown from "@/utils/DropDown";
import PaymentDatePicker from "@/utils/paymentDate";
import { MaterialIcons } from "@expo/vector-icons"; // Or use another icon library if needed

import { useSociety } from "@/utils/SocietyContext";

import { billItemLedgerGroupList } from "@/components/LedgerGroupList"; // Import the array
import { fetchAccountList } from "@/utils/acountFetcher";

import { Button, Switch, Text, Divider, IconButton } from "react-native-paper";
import { fetchSelectedWingData } from "@/utils/fetchSelectedWingData";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";

// Define TypeScript type for a bill item
interface BillItem {
  id: string;
  itemName: string;
  notes?: string;
  type?: string;
  ownerAmount?: number;
  rentAmount?: number;
  closedUnitAmount?: number;
  ledgerAccount?: string;
  groupFrom?: string;
  updatedLedgerAccount?: string;
}

interface Member {
  label: string;
  value: string;
  floor: string;
}

const CreateScheduledBill = () => {
  const { societyName } = useSociety();

  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [balancesheet, setBalancesheet] = useState("");
  const [isAdvancePaymentSettelement, setisAdvancePaymentSettelement] =
    useState(false);
  const [billduration, setBillduration] = useState("");
  const [billdueduration, setBilldueduration] = useState("");

  const balancesheets = ["Main Balance"];
  const occuranceArray = ["One Time", "Recurring"];
  const penaltyTypeArray = ["Fixed Price", "Percentage"];

  // map duration labels to months/years
  const durationMap: Record<string, number> = {
    "1 Month": 1,
    "2 Months": 2,
    "3 Months": 3,
    "6 Months": 6,
    "1 Year": 12,
  };

  // map due duration labels to days
  const dueDurationMap: Record<
    string,
    number | "endOfMonth" | "endOfNextMonth"
  > = {
    "Net 7": 7,
    "Net 10": 10,
    "Net 15": 15,
    "Net 28": 28,
    "Net 30": 30,
    "Net 45": 45,
    "Due end of the month": "endOfMonth",
    "Due end of the nest month": "endOfNextMonth",
  };

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);

  const [loading, setLoading] = useState(false);

  const [isEnablePenalty, setIsEnablePenalty] = useState(false);
  const [Occurance, setOccurance] = useState("");
  const [recurringFrequency, setRecurringFrequency] = useState("");
  const [penaltyType, setPenaltyType] = useState("");
  const [fixPricePenalty, setfixPricePenalty] = useState("");
  const [percentPenalty, setPercentPenalty] = useState("");

  const router = useRouter();
  const params = useLocalSearchParams();
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [billItems, setBillItems] = useState<BillItem[]>([]);

  const [accountFromOptions, setAccountFromOptions] = useState<
    { label: string; value: string; group: string }[]
  >([]);

  const [ledgerAccountPenalty, setLedgerAccountPenalty] = useState<string>("");
  const [ledgerAccountGroupPenalty, setLedgerAccountGroupPenalty] =
    useState<string>("");

  const customWingsSubcollectionName = `${societyName} wings`;

  const [wings, setWings] = useState<{ label: string; value: string }[]>([]);

  const [selectedWings, setSelectedWings] = useState<string[]>([]);
  const [selectedWingsMembers, setselectedWingsMembers] = useState<Member[]>(
    []
  );

  const [
    formattedSelectedWingMembersData,
    setFormattedSelectedWingMembersData,
  ] = useState<string[]>([]);

  useEffect(() => {
    console.log(
      "formattedSelectedWingMembersData",
      formattedSelectedWingMembersData
    );
  }, [formattedSelectedWingMembersData]);

  useEffect(() => {
    // Format the data as desired
    // const newData = selectedfetchedMembers.map((item) => `${item.floor} ${item.label}`);
    const newSelectedWingsMembersData = selectedWingsMembers.map((item) => {
      const [wing, flatAndUserId] = item.value.split(" ");
      const flatNumber = flatAndUserId.split("-")[0]; // extract only the flat number part (before userId)
      return `${item.floor}-${wing}-${flatNumber}`;
    });
    // ✅ Remove duplicates using Set
    const uniqueData = Array.from(new Set(newSelectedWingsMembersData));
    setFormattedSelectedWingMembersData(uniqueData);
  }, [selectedWingsMembers]);

  useEffect(() => {
    const loadWings = async () => {
      const wingsRef = collection(
        db,
        "Societies",
        societyName,
        customWingsSubcollectionName
      );
      const snapshot = await getDocs(wingsRef);
      const wingOptions = snapshot.docs.map((doc) => ({
        label: doc.id,
        value: doc.id,
      }));
      setWings(wingOptions);
    };
    loadWings();
  }, [societyName]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!selectedWings.length) return;
      const data = await fetchSelectedWingData(societyName, selectedWings);
      // ✅ Filter out flats where flatType === "dead"
      const activeFlats = data.filter(
        (member) => !member.flatType || member.flatType.toLowerCase() !== "dead"
      );

      setselectedWingsMembers(activeFlats);

      // Optional: Log how many were skipped
      const skipped = data.length - activeFlats.length;
      if (skipped > 0) {
        console.log(`🟡 Skipped ${skipped} dead flats from selected wings`);
      }
    };
    loadMembers();
  }, [selectedWings]);

  // fetch Paid From List
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const { accountOptions } = await fetchAccountList(
          societyName,
          billItemLedgerGroupList
        );
        setAccountFromOptions(accountOptions);
      } catch (error) {
        if (error) {
          Alert.alert(error as string, "Failed to fetch account options.");
        }
      }
    };
    fetchOptions();
  }, [societyName]);

  const handleDateChange = (newDate: Date, type: string) => {
    if (type === "start") {
      setStartDate(newDate);
    } else if (type === "end") {
      setEndDate(newDate);
    } else if (type === "due") {
      setDueDate(newDate);
    }
  };

  // Fetch Bill Items from Firestore
  useEffect(() => {
    if (params?.id) {
      setIsEditMode(true);
    }
    const fetchBillItems = async () => {
      try {
        const storedItem = await AsyncStorage.getItem("@createdBillItem");
        if (storedItem) {
          const parsedItems: BillItem[] = JSON.parse(storedItem);
          const uniqueItems = parsedItems.filter(
            (newItem) =>
              !billItems.some((existingItem) => existingItem.id === newItem.id)
          );
          setBillItems((prevItems) => [...prevItems, ...uniqueItems]);
        }
      } catch (error) {
        console.error("Error fetching bill items:", error);
        Alert.alert("Error", "Failed to load bill items.");
      }
    };

    fetchBillItems();
  }, [params?.id]);

  // Save Bill Items to AsyncStorage
  const saveBillItems = async (items: BillItem[]) => {
    try {
      await AsyncStorage.setItem("@createdBillItem", JSON.stringify(items));
    } catch (error) {
      console.error("Error saving bill items:", error);
      Alert.alert("Error", "Failed to save bill items.");
    }
  };

  // Handle Edit Action
  const handleEdit = (item: BillItem) => {
    router.push({
      pathname: "./AddSpecialBillItem",
      params: { itemId: item.id }, // Pass item ID for editing
    });
  };

  // Handle Delete Action
  const handleDelete = (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this item?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedItems = billItems.filter((item) => item.id !== id);
            setBillItems(updatedItems);
            await saveBillItems(updatedItems);
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!billduration || !startDate) return;

    const monthsToAdd = durationMap[billduration];
    if (!monthsToAdd) return;

    const newEndDate = new Date(startDate);
    newEndDate.setMonth(newEndDate.getMonth() + monthsToAdd);

    setEndDate(newEndDate);
  }, [billduration, startDate]);

  useEffect(() => {
    if (!billdueduration || !startDate) return;

    const duration = dueDurationMap[billdueduration];
    let newDueDate = new Date(startDate);

    if (typeof duration === "number") {
      newDueDate.setDate(newDueDate.getDate() + duration);
    } else if (duration === "endOfMonth") {
      newDueDate = new Date(
        newDueDate.getFullYear(),
        newDueDate.getMonth() + 1,
        0
      );
    } else if (duration === "endOfNextMonth") {
      newDueDate = new Date(
        newDueDate.getFullYear(),
        newDueDate.getMonth() + 2,
        0
      );
    }

    setDueDate(newDueDate);
  }, [billdueduration, startDate]);

  const navigateToNextScreen = () => {
    // Validation logic
    if (!name.trim()) {
      Alert.alert("Validation Error", "Please enter a Name.");
      return;
    }
    if (!startDate) {
      Alert.alert("Validation Error", "Please select a Start Date.");
      return;
    }
    if (!endDate) {
      Alert.alert("Validation Error", "Please select a endDate.");
      return;
    }
    if (!dueDate) {
      Alert.alert("Validation Error", "Please select a dueDate.");
      return;
    }
    if (formattedSelectedWingMembersData.length === 0) {
      Alert.alert("Validation Error", "Please select at least one Wing.");
      return;
    }
    if (billItems.length === 0) {
      Alert.alert("Validation Error", "Please add at least one Bill Item.");
      return;
    }

    // Construct parameters for navigation
    const params = {
      name,
      note,
      balancesheet,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      dueDate: dueDate.toISOString().split("T")[0],
      members: formattedSelectedWingMembersData.join(", "),
      items: JSON.stringify(billItems),
      isEnablePenalty: isEnablePenalty ? "true" : "false", // Convert boolean to string,
      Occurance,
      recurringFrequency,
      penaltyType,
      fixPricePenalty,
      percentPenalty,
      ledgerAccountPenalty,
      ledgerAccountGroupPenalty,
      billduration,
      billdueduration,
    };

    // Navigate to the next screen
    router.push({
      pathname: "/admin/Bills/Maintenance/NextScreenScheduled",
      params,
    });
  };

  // Save Filled Form Data before going to Add Bill Item
  const saveFormData = async () => {
    const formData = {
      name,
      note,
      balancesheet,
      isAdvancePaymentSettelement,
      startDate,
      endDate,
      dueDate,
      Occurance,
      recurringFrequency,
      penaltyType,
      fixPricePenalty,
      percentPenalty,
      ledgerAccountPenalty,
      ledgerAccountGroupPenalty,
      isEnablePenalty,
      selectedWings,
      billduration,
      billdueduration,
    };
    await AsyncStorage.setItem("@scheduleBillForm", JSON.stringify(formData));
  };

  // restore Filled Form Data the data on mount using useEffect
  useEffect(() => {
    const loadFormData = async () => {
      const saved = await AsyncStorage.getItem("@scheduleBillForm");
      if (saved) {
        const parsed = JSON.parse(saved);
        setName(parsed.name || "");
        setNote(parsed.note || "");
        setBalancesheet(parsed.balancesheet || "");
        setisAdvancePaymentSettelement(
          parsed.isAdvancePaymentSettelement || false
        );
        setStartDate(
          parsed.startDate ? new Date(parsed.startDate) : new Date()
        );
        setEndDate(parsed.endDate ? new Date(parsed.endDate) : new Date());
        setDueDate(parsed.dueDate ? new Date(parsed.dueDate) : new Date());
        setOccurance(parsed.Occurance || "");
        setRecurringFrequency(parsed.recurringFrequency || "");
        setPenaltyType(parsed.penaltyType || "");
        setfixPricePenalty(parsed.fixPricePenalty || "");
        setPercentPenalty(parsed.percentPenalty || "");
        setLedgerAccountPenalty(parsed.ledgerAccountPenalty || "");
        setLedgerAccountGroupPenalty(parsed.ledgerAccountGroupPenalty || "");
        setIsEnablePenalty(parsed.isEnablePenalty || false);
        setSelectedWings(parsed.selectedWings || []);
        setBillduration(parsed.billduration || "");
        setBilldueduration(parsed.billdueduration || "");
      }
    };
    loadFormData();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Appbar */}
      <AppbarComponent title="Schedule Bill" source="Admin" />

      <FlatList
        data={[{}]} // Use a single-item list to render your UI
        renderItem={() => (
          <>
            {/* Bill Details Section */}
            <View style={styles.cardview}>
              <Text style={styles.sectionHeader}>Bill Details</Text>
              <Divider style={styles.divider} />
              {/* Custom Voucher No */}
              <View style={{ width: "100%" }}>
                <CustomInput label="Name" value={name} onChangeText={setName} />
              </View>

              {/* Notes */}
              <View style={{ width: "100%" }}>
                <CustomInput
                  label="Notes (optional)"
                  value={note}
                  onChangeText={setNote}
                  multiline={true}
                />
              </View>

              {/* Dropdown for Balancesheet */}
              <View style={styles.section}>
                <Text style={styles.label}>Balancesheet</Text>
                <Dropdown
                  data={balancesheets.map((option) => ({
                    label: option,
                    value: option,
                  }))}
                  onChange={(selectedValue) => {
                    setBalancesheet(selectedValue);
                  }}
                  placeholder="Select "
                  initialValue={balancesheet}
                />
              </View>
            </View>

            {/* Bill Duration Section */}
            <View style={styles.cardview}>
              <Text style={styles.sectionHeader}>Bill Duration</Text>
              <Divider style={styles.divider} />

              {/* Date Pickers */}
              {/* From Date */}
              <View style={styles.section}>
                <Text style={styles.label}>From Date</Text>
                <PaymentDatePicker
                  initialDate={startDate}
                  onDateChange={(newDate) => handleDateChange(newDate, "start")}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              {/* To Date */}
              <View style={styles.section}>
                <Text style={styles.label}>Duration</Text>

                <Dropdown
                  data={Object.keys(durationMap).map((key) => ({
                    label: key,
                    value: key, // we’ll use the label as value since durationMap needs it
                  }))}
                  onChange={(selectedValue) => {
                    setBillduration(selectedValue);
                  }}
                  placeholder="Select "
                  initialValue={billduration}
                />
              </View>
              {/* Due Date */}
              <View style={styles.section}>
                <Text style={styles.label}>
                  Due duration from Bill date (days)
                </Text>
                <Dropdown
                  data={Object.keys(dueDurationMap).map((key) => ({
                    label: key,
                    value: key, // same as label since you’ll use it for lookup
                  }))}
                  onChange={(selectedValue) => {
                    setBilldueduration(selectedValue);
                  }}
                  placeholder="Select "
                  initialValue={billdueduration}
                />
              </View>

              {/* Select Wings */}
              <View style={styles.section}>
                <Text style={styles.label}>Wings</Text>
                <DropdownMultiSelect
                  options={wings}
                  selectedValues={selectedWings}
                  onChange={setSelectedWings}
                  placeholder="Select Wings"
                />
              </View>
            </View>

            {/* Added Items to bill */}

            {billItems.length > 0 && (
              <View style={styles.cardview}>
                <Text style={styles.sectionHeader}>Bill Items</Text>
                <FlatList
                  data={billItems}
                  contentContainerStyle={{ paddingBottom: 100 }}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false} // Disable scrolling
                  renderItem={({ item }) => (
                    <View style={styles.listItem}>
                      <View style={styles.listItemContent}>
                        <Text style={styles.listItemText}>
                          Item Name: {item.itemName}
                        </Text>
                        {item.notes && (
                          <Text style={styles.listItemText}>
                            Notes: {item.notes}
                          </Text>
                        )}
                        {item.type && (
                          <Text style={styles.listItemText}>
                            Type: {item.type}
                          </Text>
                        )}
                        {item.ownerAmount && (
                          <Text style={styles.listItemText}>
                            Owner Amount: {item.ownerAmount}
                          </Text>
                        )}
                        {item.rentAmount && (
                          <Text style={styles.listItemText}>
                            Rent Amount: {item.rentAmount}
                          </Text>
                        )}
                        {item.closedUnitAmount && (
                          <Text style={styles.listItemText}>
                            Closed Unit Amount: {item.closedUnitAmount}
                          </Text>
                        )}
                        {item.updatedLedgerAccount && (
                          <Text style={styles.listItemText}>
                            updated Ledger Account: {item.updatedLedgerAccount}
                          </Text>
                        )}
                        {item.groupFrom && (
                          <Text style={styles.listItemText}>
                            groupFrom: {item.groupFrom}
                          </Text>
                        )}
                      </View>
                      <View style={styles.listItemActions}>
                        {/* Edit Button */}
                        <IconButton
                          icon="pencil"
                          size={20}
                          onPress={() => handleEdit(item)}
                          style={styles.actionButton}
                        />
                        {/* Delete Button */}
                        <IconButton
                          icon="delete"
                          size={20}
                          onPress={() => handleDelete(item.id)}
                          style={styles.actionButton}
                        />
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={<Text>No items available</Text>}
                />
              </View>
            )}

            {/* Buttons */}

            <TouchableOpacity
              onPress={async () => {
                if (!balancesheet) {
                  Alert.alert("Generate Bill", "Select Balancesheet");
                } else {
                  await saveFormData(); // 🟢 Save before navigating
                  // Navigate to the Items Page and pass balancesheet as a parameter
                  router.push({
                    pathname: "/admin/Bills/Maintenance/ScheduleBillitems", // Adjust this path based on your routing structure  specialBillitems
                    params: { balancesheet }, // Pass the balancesheet value
                  });
                }
              }}
              style={styles.addButtonNew}
            >
              <View style={styles.buttonContent}>
                <MaterialIcons
                  name="add-circle-outline"
                  size={24}
                  color="#000"
                />
                <Text style={styles.addButtonText}>Add Bill Item</Text>
              </View>
            </TouchableOpacity>

            {/* switch - for Advance Payment Settelment */}
            <View style={styles.cardview}>
              <View style={styles.switchContainer}>
                <Text style={styles.label}>Advance Payment Settelement?</Text>
                <Switch
                  value={isAdvancePaymentSettelement}
                  onValueChange={() =>
                    setisAdvancePaymentSettelement(!isAdvancePaymentSettelement)
                  }
                  color="#4CAF50"
                />
              </View>
            </View>

            {/* switch - for Penalty */}

            <View style={styles.cardview}>
              <View style={styles.switchContainer}>
                <Text style={styles.label}>Enable Penalty</Text>
                <Switch
                  value={isEnablePenalty}
                  onValueChange={() => setIsEnablePenalty(!isEnablePenalty)}
                  color="#4CAF50"
                />
              </View>

              {isEnablePenalty && (
                <>
                  <View style={styles.section}>
                    <Text style={styles.label}>Select Occurance</Text>
                    <Dropdown
                      data={occuranceArray.map((option) => ({
                        label: option,
                        value: option,
                      }))}
                      onChange={(selectedValue) => {
                        setOccurance(selectedValue);
                      }}
                      placeholder="Select "
                      initialValue={Occurance}
                    />
                  </View>

                  {Occurance === "Recurring" && (
                    <View style={styles.section}>
                      <Text style={styles.label}>Day(s)</Text>
                      <TextInput
                        style={styles.penaltyTextInput}
                        placeholder="0"
                        value={recurringFrequency}
                        onChangeText={setRecurringFrequency}
                        keyboardType={"numeric"}
                      />
                      <Text style={styles.recurringText}>
                        set how many days after penalty calculate again
                      </Text>
                    </View>
                  )}

                  <View style={styles.section}>
                    <Text style={styles.label}>Penalty Type</Text>
                    <Dropdown
                      data={penaltyTypeArray.map((option) => ({
                        label: option,
                        value: option,
                      }))}
                      onChange={(selectedValue) => {
                        setPenaltyType(selectedValue);
                      }}
                      placeholder="Select "
                      initialValue={penaltyType}
                    />
                  </View>
                  {penaltyType === "Fixed Price" && (
                    <View style={styles.section}>
                      <Text style={styles.label}>Fixed Price</Text>
                      <TextInput
                        style={styles.penaltyTextInput}
                        placeholder="0.00"
                        value={fixPricePenalty}
                        onChangeText={setfixPricePenalty}
                        keyboardType={"numeric"}
                      />
                    </View>
                  )}
                  {penaltyType === "Percentage" && (
                    <View style={styles.section}>
                      <Text style={styles.label}>Percentage (%)</Text>
                      <TextInput
                        style={styles.penaltyTextInput}
                        placeholder="0.00"
                        value={percentPenalty}
                        onChangeText={setPercentPenalty}
                        keyboardType={"numeric"}
                      />
                    </View>
                  )}

                  {/* Penalty Ledger Account */}
                  <View style={styles.section}>
                    <Text style={styles.label}>Ledger Account</Text>
                    <Dropdown
                      data={accountFromOptions.map((option) => ({
                        label: option.label,
                        value: option.value,
                      }))}
                      onChange={(selectedValue) => {
                        setLedgerAccountPenalty(selectedValue);

                        // Find the selected account to get its group
                        const selectedOption = accountFromOptions.find(
                          (option) => option.value === selectedValue
                        );
                        if (selectedOption) {
                          setLedgerAccountGroupPenalty(selectedOption.group); // Set the group name
                        }
                      }}
                      placeholder="Select Account"
                      initialValue={ledgerAccountPenalty}
                    />
                  </View>
                </>
              )}
            </View>

            <Button mode="contained" onPress={navigateToNextScreen}>
              Next
            </Button>
          </>
        )}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.scrollContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  cardview: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    elevation: 4, // For shadow on Android
    shadowColor: "#000", // For shadow on iOS
    shadowOffset: { width: 0, height: 2 }, // For shadow on iOS
    shadowOpacity: 0.1, // For shadow on iOS
    shadowRadius: 4, // For shadow on iOS
    borderWidth: 1, // Optional for outline
    borderColor: "#e0e0e0", // Optional for outline
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  divider: {
    marginBottom: 10,
  },

  listItem: {
    position: "relative",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    elevation: 2,
  },
  listItemText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  listItemContent: {
    flex: 1,
  },
  listItemActions: {
    position: "absolute",
    top: 10, // Distance from the top of the card
    right: 10, // Distance from the right edge
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    marginLeft: 8, // Space between icons
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center", // Ensures vertical alignment
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
    flexShrink: 1, // Prevents text from pushing the switch
  },
  scrollContainer: { padding: 16, paddingBottom: 100 },
  section: { marginBottom: 16 },

  addButtonNew: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 4, // For shadow (Android)
    shadowColor: "#000", // For shadow (iOS)
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: "center",
    marginVertical: 10,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginLeft: 8,
  },
  penaltyTextInput: {
    borderBottomColor: "black",
    borderBottomWidth: 1,
  },
  recurringText: {
    fontSize: 12,
    marginVertical: 6,
    alignSelf: "center", // Centers horizontally
    minWidth: 100, // Ensures it doesn't shrink too much
    alignItems: "center", // Centers text inside
    marginLeft: 6,
  },
});

export default CreateScheduledBill;
