import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableWithoutFeedback,
  FlatList,
} from "react-native";
import React, { useEffect, useState } from "react";

import { db } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  collectionGroup,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { useSociety } from "@/utils/SocietyContext";

import { useLocalSearchParams, useRouter } from "expo-router";

import AppbarComponent from "@/components/AppbarComponent";
import AppbarMenuComponent from "@/components/AppbarMenuComponent";
import { updateLedger } from "@/utils/updateLedger";
import { updateFlatCurrentBalance } from "@/utils/updateFlatCurrentBalance"; // Adjust path as needed

// Define the structure of flatsData
type FlatData = {
  flatType: string;
  resident: string;
  memberStatus: string;
  ownerRegisterd?: string; // Optional property
  renterRegisterd?: string; // Optional property
  billStatus: string;
  billAmount?: number;
  overdueDays?: number;
};

type FlatsData = Record<string, Record<string, Record<string, FlatData>>>;

const flatColors: Record<string, string> = {
  paid: "#4CAF50", // Green
  unpaid: "#FA8072", // Salmon
  "Pending Approval": "#FFEB3B", // Yellow
  Overdue: "#FF0000", // Red
  "Advanced Payment": "#2196F3", // Blue
  "No Bill": "#777B7E", // Red
};

const StatusType = [
  "paid",
  "unpaid",
  "Pending Approval",
  "Overdue",
  "Advanced Payment",
  "No Bill",
];

const StatusColor: Record<string, string> = {
  paid: "#4CAF50", // Green
  unpaid: "#FA8072", // Salmon
  "Pending Approval": "#FFEB3B", // Yellow
  Overdue: "#FF0000", // Red
  "Advanced Payment": "#2196F3", // Blue
  "No Bill": "#777B7E", // Red
};

const BillDetailNew = () => {
  const { title, id } = useLocalSearchParams();
  const router = useRouter();
  const { societyName: mysocietyName } = useSociety();
  const [loading, setLoading] = useState(true);

  const customWingsSubcollectionName = `${mysocietyName} wings`;
  const customFloorsSubcollectionName = `${mysocietyName} floors`;
  const customFlatsSubcollectionName = `${mysocietyName} flats`;
  // const customFlatsBillsSubcollectionName = `${mysocietyName} bills`;
  const customFlatsBillsSubcollectionName = "flatbills";
  // const specialBillCollectionName = `specialBills_${mysocietyName}`;
  // const unclearedBalanceSubcollectionName = `unclearedBalances_${mysocietyName}`;

  const unclearedBalanceSubcollectionName = "unclearedBalances";

  const [flatsData, setFlatsData] = useState<FlatsData>({}); // Explicit type for flatsData
  const [flatTypeCounts, setFlatTypeCounts] = useState<Record<string, number>>(
    {}
  );

  const [selectedWing, setSelectedWing] = useState<string | null>(null);

  const currentDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetchFlatsData();
  }, []);

  const fetchFlatsData = async () => {
    setLoading(true);
    try {
      const q = query(
        collectionGroup(db, customFlatsBillsSubcollectionName),
        where("societyName", "==", mysocietyName),
        where("name", "==", title) // 'id' must be a field in your documents
      );

      const [flatsQuerySnapshot, flatsBillSnapshot] = await Promise.all([
        getDocs(collectionGroup(db, customFlatsSubcollectionName)),
        getDocs(q),
      ]);

      // Step 1: Define a properly typed billStatusMap
      const billStatusMap: Record<
        string,
        Record<
          string,
          Record<
            string,
            {
              billStatus: string;
              overdueDays: number;
              billAmount: number;
            }
          >
        >
      > = {};

      flatsBillSnapshot.forEach((doc) => {
        const billsData = doc.data();
        const billStatus = billsData.status as string; // Ensure it's a string
        const billDueDate = billsData.dueDate;
        const billAmount = billsData.amount || 0; // Default to 0 if amount is missing
        const billsPath = doc.ref.path;
        const pathSegments = billsPath.split("/");

        const wing = pathSegments[3];
        const floor = pathSegments[5];
        const flat = pathSegments[7];

        const currentDate = new Date();
        let overdueDays = 0;
        const billDueDateindatetype = new Date(billDueDate + "T00:00:00"); // Convert string to Date (UTC start of day)

        // Calculate overdue days if dueDate exists and bill is "Unpaid"
        if (
          billDueDate &&
          billStatus.toLowerCase() === "unpaid" &&
          currentDate > billDueDateindatetype
        ) {
          overdueDays = Math.floor(
            (currentDate.getTime() - billDueDateindatetype.getTime()) /
              (1000 * 60 * 60 * 24)
          );
        }

        const finalBillStatus = overdueDays > 0 ? "Overdue" : billStatus; // Mark as "Overdue" if overdueDays > 0

        if (!billStatusMap[wing]) billStatusMap[wing] = {};
        if (!billStatusMap[wing][floor]) billStatusMap[wing][floor] = {};
        billStatusMap[wing][floor][flat] = {
          billStatus: finalBillStatus,
          overdueDays,
          billAmount,
        };
      });

      // Step 2: Build the data object, adding billStatus where applicable
      const data: Record<string, any> = {};

      flatsQuerySnapshot.forEach((doc) => {
        const flatData = doc.data();
        const flatId = doc.id;

        const flatPath = doc.ref.path;
        const pathSegments = flatPath.split("/");
        const wing = pathSegments[3];
        const floor = pathSegments[5];

        if (!data[wing]) data[wing] = {};
        if (!data[wing][floor]) data[wing][floor] = {};

        const flatType = flatData.flatType || "";
        const billInfo = billStatusMap[wing]?.[floor]?.[flatId] || {
          billStatus: "No Bill",
          overdueDays: 0,
          billAmount: 0,
        };

        data[wing][floor][flatId] = {
          flatType,
          resident: flatData.resident || "",
          memberStatus: flatData.memberStatus || "",
          ownerRegisterd: flatData.ownerRegisterd || "",
          renterRegisterd: flatData.renterRegisterd || "",
          billStatus: billInfo.billStatus,
          overdueDays: billInfo.overdueDays, // Add overdue days to the state
          billAmount: billInfo.billAmount, // Add bill amount to the state
        };

        // console.log("billInfo.billStatus", billInfo.billStatus)
      });

      setFlatsData(data);
      // console.log("setFlatsData", data)
    } catch (error) {
      console.error("Error fetching flats data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set the first wing as selected when flatsData is loaded
    if (!selectedWing && Object.keys(flatsData).length > 0) {
      setSelectedWing(Object.keys(flatsData)[0]); // Select the first wing (e.g., "A")
    }
  }, [flatsData]);

  useEffect(() => {
    if (selectedWing && flatsData[selectedWing]) {
      const counts: Record<string, number> = {};
      Object.values(flatsData[selectedWing]).forEach((floor) => {
        Object.values(floor).forEach((flat) => {
          const flatType = flat.flatType || "";
          counts[flatType] = (counts[flatType] || 0) + 1;
        });
      });
      setFlatTypeCounts(counts);
    } else {
      setFlatTypeCounts({});
    }
  }, [selectedWing, flatsData]);

  const handleFlatPress = (
    flatId: string,
    flatType: string,
    floor: string,
    wing: string,
    billStatus: string
  ) => {
    console.log(
      `Yes pressed for flat: ${flatId}, flatType: ${flatType}, Floor: ${floor}, Wing: ${wing}, billStatus: ${billStatus}`
    );

    router.push({
      pathname: "../BillDetailPerFlatNew", // Update with your route path
      params: {
        wing: selectedWing,
        floorName: floor,
        flatNumber: flatId,
        billNumber: id,
        flatType,
        billStatus,
      },
    });
  };

  const renderFlats = () => {
    if (!selectedWing || !flatsData[selectedWing]) return null;

    const floors = Object.keys(flatsData[selectedWing]);

    const renderFloor = ({ item: floor }: any) => {
      const flats = Object.keys(flatsData[selectedWing][floor]);

      return (
        <View style={styles.floorContainer}>
          <View style={styles.row}>
            {flats.map((flat) => {
              const flatData = flatsData[selectedWing][floor][flat];
              const flatColor =
                flatColors[flatData.billStatus] || flatColors["No Bill"];

              return (
                <TouchableOpacity
                  key={flat}
                  style={[styles.flatContainer, { backgroundColor: flatColor }]}
                  onPress={() =>
                    handleFlatPress(
                      flat,
                      flatData.flatType,
                      floor,
                      selectedWing,
                      flatData.billStatus
                    )
                  }
                >
                  <Text style={styles.flatText}>{flat}</Text>

                  {flatData.billStatus.toLowerCase() === "unpaid" && (
                    <Text style={styles.billText}>
                      Bill: {flatData.billAmount}
                    </Text>
                  )}

                  {flatData.billStatus === "Overdue" && (
                    <>
                      <Text style={styles.billText}>
                        {flatData.overdueDays} days
                      </Text>
                      <Text style={styles.billText}>
                        ₹ {flatData.billAmount}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    };

    return (
      <ScrollView style={styles.scrollcontainer} horizontal={true}>
        <FlatList
          data={floors}
          renderItem={renderFloor}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        />
      </ScrollView>
    );
  };

  {
    /** 

  const renderFlats = () => {
    if (!selectedWing || !flatsData[selectedWing]) return null;

    return (
      <View style={styles.outerscrollContent}>
        <ScrollView horizontal style={styles.scrollView}>
          <View style={styles.scrollContent}>
            {Object.keys(flatsData[selectedWing]).map((floor) => (
              <View key={floor} style={styles.floorContainer}>
                <View style={styles.row}>
                  {Object.keys(flatsData[selectedWing][floor]).map((flat) => {
                    const flatData = flatsData[selectedWing][floor][flat];
                    const flatColor =
                      flatColors[flatData.billStatus] || flatColors["No Bill"]; // Default to No Bill color if flatType is missing
                    return (
                      <TouchableOpacity
                        key={flat}
                        style={[
                          styles.flatContainer,
                          { backgroundColor: flatColor },
                        ]}
                        onPress={() =>
                          handleFlatPress(
                            flat,
                            flatData.flatType,
                            floor,
                            selectedWing,
                            flatData.billStatus
                          )
                        }
                      >
                        <Text style={styles.flatText}>{flat}</Text>
                        {flatData.billStatus.toLowerCase() === "unpaid" && (
                          <Text style={styles.billText}>
                            Bill: {flatData.billAmount}
                          </Text>
                        )}
                        {flatData.billStatus === "Overdue" && (
                          <>
                            <Text style={styles.billText}>
                              {flatData.overdueDays} days
                            </Text>
                            <Text style={styles.billText}>
                              ₹ {flatData.billAmount}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  */
  }

  const [menuVisible, setMenuVisible] = useState(false);

  const handleDeleteBill = async (billNumber: string) => {
    console.log("billNumber", billNumber);

    Alert.alert(
      "Confirmation",
      "Are you sure to delete? You can't recover this data.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            console.log(`Deleting bill ${billNumber}`);
            setLoading(true);
            // const mainBillRef = `Societies/${mysocietyName}/${specialBillCollectionName}/${billNumber}`;
            const mainBillRef = `Bills/${billNumber}`;
            const mainBillDocRef = doc(db, mainBillRef);

            try {
              // Run both Firestore queries concurrently
              const q = query(
                collectionGroup(db, customFlatsBillsSubcollectionName),
                where("societyName", "==", mysocietyName),
                where("name", "==", title) // 'id' must be a field in your documents
              );

              const [mainBillDocSnap, flatsBillSnapshot] = await Promise.all([
                getDoc(mainBillDocRef),
                getDocs(q),
              ]);

              if (!mainBillDocSnap.exists()) {
                console.error("Main bill document does not exist.");
                return;
              }

              const mainBillData = mainBillDocSnap.data();
              const billItems = mainBillData?.items || [];

              // First process each flat bill

              for (const flatBillDoc of flatsBillSnapshot.docs) {
                // Use for...of instead of forEach
                const flatbillId = flatBillDoc.id;

                if (flatbillId === billNumber) {
                  const billsPerFlatData = flatBillDoc.data();
                  const status = billsPerFlatData.status;

                  const billsPath = flatBillDoc.ref.path;
                  const pathSegments = billsPath.split("/");
                  const wing = pathSegments[3];
                  const floor = pathSegments[5];
                  const flat = pathSegments[7];
                  const flatType = flatsData?.[wing]?.[floor]?.[flat]?.flatType;
                  // console.log(`Flat Type for ${wing} - Floor ${floor} - Flat ${flat}:`, flatType);

                  if (status === "unpaid") {
                    for (const item of billItems) {
                      const amountledger =
                        flatType === "Closed"
                          ? item.closedUnitAmount
                          : flatType === "Rent"
                            ? item.rentAmount
                            : item.ownerAmount;

                      // console.log('amountledger', amountledger);
                      // console.log(item.ledgerAccount);
                      // console.log(item.updatedLedgerAccount);
                      // console.log(item.groupFrom);

                      // Update item ledger and account receivable. Date is current date when bill is deleted
                      const ledgerUpdate = await updateLedger(
                        mysocietyName,
                        "Account Receivable",
                        item.updatedLedgerAccount,
                        amountledger,
                        "Subtract",
                        currentDate
                      );
                      console.log(
                        `Account Receivable Ledger Update Status: ${ledgerUpdate}`
                      );

                      const ledgerUpdate2 = await updateLedger(
                        mysocietyName,
                        item.groupFrom,
                        item.ledgerAccount,
                        amountledger,
                        "Subtract",
                        currentDate
                      );
                      console.log(
                        `Item Ledger Update Status: ${ledgerUpdate2}`
                      );
                    }
                  } else if (status === "paid") {
                    // Handle paid status
                    // update item ledger
                    for (const item of billItems) {
                      const amountledger =
                        flatType === "Closed"
                          ? item.closedUnitAmount
                          : flatType === "Rent"
                            ? item.rentAmount
                            : item.ownerAmount;
                      // Update item ledger account. Date is current date when bill is deleted
                      const ledgerUpdate2 = await updateLedger(
                        mysocietyName,
                        item.groupFrom,
                        item.ledgerAccount,
                        amountledger,
                        "Subtract",
                        currentDate
                      );
                      console.log(
                        ` item Ledger Update Status: ${ledgerUpdate2}`
                      );
                    }

                    // update penalty if exists
                    if (mainBillData!.isEnablePenalty) {
                      const penaltyAmount = billsPerFlatData.penaltyAmount;
                      const billpaidLedgerAccount =
                        billsPerFlatData.ledgerAccountPenalty;
                      const billpaidLedgerGroup =
                        billsPerFlatData.ledgerAccountGroupPenalty;

                      const LedgerUpdate = await updateLedger(
                        mysocietyName,
                        billpaidLedgerGroup,
                        billpaidLedgerAccount,
                        penaltyAmount,
                        "Subtract",
                        currentDate
                      ); // Update Ledger
                      console.log(
                        ` Penalty Ledger Update Status: ${LedgerUpdate}`
                      );
                    }

                    // Update Unclread balance selectedBills and selectedIds
                    const transactionId = billsPerFlatData.transactionId;
                    const unclearedBalanceRef = `Societies/${mysocietyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floor}/${customFlatsSubcollectionName}/${flat}/${unclearedBalanceSubcollectionName}/${transactionId}`;
                    const unclearedBalanceDocRef = doc(db, unclearedBalanceRef);
                    const docSnap = await getDoc(unclearedBalanceDocRef);
                    if (docSnap.exists()) {
                      const data = docSnap.data();
                      // Bill number to delete
                      const billToDelete = billNumber;

                      // Remove from selectedIds
                      const updatedSelectedIds =
                        data.selectedIds?.filter(
                          (id: string) => id !== billToDelete
                        ) || [];
                      // Remove from selectedBills
                      const updatedSelectedBills =
                        data.selectedBills?.filter(
                          (bill: any) => bill.id !== billToDelete
                        ) || [];
                      // Update Firestore document
                      await updateDoc(unclearedBalanceDocRef, {
                        selectedIds: updatedSelectedIds,
                        selectedBills: updatedSelectedBills,
                        type: "Bill Deleted",
                      });
                      console.log(
                        "Bill successfully deleted from uncleared balance."
                      );
                    }
                    // Add the deleted Amount to current Balance
                    const receiptAmount = billsPerFlatData.receiptAmount;
                    // const currentBalanceSubcollectionName = `currentBalance_${flat}`;
                    const currentBalanceSubcollectionName =
                      "flatCurrentBalance";
                    const currentbalanceCollectionRef = `Societies/${mysocietyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floor}/${customFlatsSubcollectionName}/${flat}/${currentBalanceSubcollectionName}`;
                    const currentbalanceCollectionDocRef = collection(
                      db,
                      currentbalanceCollectionRef
                    );

                    const result = await updateFlatCurrentBalance(
                      currentbalanceCollectionDocRef,
                      receiptAmount,
                      "Add",
                      currentDate,
                      mysocietyName
                    );
                    console.log("Balance update result:", result);
                    const result2 = await updateLedger(
                      mysocietyName,
                      "Current Liabilities",
                      "Members Advanced",
                      receiptAmount,
                      "Add",
                      currentDate
                    ); // Update Ledger
                    console.log("Members Advanced update result:", result2);
                  }
                  // After Ledger Updates, Delete the bill from the "customFlatsBillsSubcollectionName" collection

                  const flatBillRef = `Societies/${mysocietyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floor}/${customFlatsSubcollectionName}/${flat}/${customFlatsBillsSubcollectionName}/${billNumber}`;
                  const flatBillDocRef = doc(db, flatBillRef);
                  await deleteDoc(flatBillDocRef);
                  console.log("Deleted Bill", billNumber, "From Flat", flat);
                }
              } // for of loop
              // After flat bills delete main bill
              await deleteDoc(mainBillDocRef);

              // After delete route to "Generate special bill index screen /(SpecialBills) "
              Alert.alert("Success", "Bill  deleted successfully.");
              router.replace({
                pathname: "/admin/Bills/Maintenance",
              });
            } catch (error) {
              console.error("Something went wrong", error);
            } finally {
              setLoading(false);
            }
          }, // onpress
        },
      ]
    );
  };

  const handleMenuOptionPress = (option: string) => {
    console.log(`${option} selected`);
    if (option === "Delete") {
      handleDeleteBill(id as string);
    }
    setMenuVisible(false);
  };
  const closeMenu = () => {
    setMenuVisible(false);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={closeMenu}>
      <View style={styles.container}>
        {/* Top Appbar */}
        <AppbarComponent
          title={(title as string) || "Default Title"}
          source="Admin"
          onPressThreeDot={() => setMenuVisible(!menuVisible)}
        />

        {/* Three-dot Menu */}
        {/* Custom Menu */}
        {menuVisible && (
          <AppbarMenuComponent
            items={[
              "View Bill Details",
              "Statistics",
              "Print Bills",
              "Overview PDF",
              "Overview Excel",
              "Delete",
            ]}
            onItemPress={handleMenuOptionPress}
            closeMenu={closeMenu}
          />
        )}

        {/* Select Wing */}
        <View style={styles.toggleContainer}>
          {Object.keys(flatsData).map((wing) => (
            <Pressable
              key={wing}
              onPress={() => setSelectedWing(wing)}
              style={[
                styles.toggleButton,
                selectedWing === wing && styles.selectedToggle,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  selectedWing === wing && styles.selectedtoggleText,
                ]}
              >
                {wing}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Legend Container */}

        <View style={styles.legendContainer}>
          {StatusType.map((type) => (
            <View key={type} style={styles.legendItem}>
              <View style={styles.legendcountContainer}>
                <View
                  style={[
                    styles.legendColor,
                    { backgroundColor: StatusColor[type] },
                  ]}
                />
                <Text style={styles.legendText}>
                  ({flatTypeCounts[type] || 0}) {/* Show count or 0 */}
                </Text>
              </View>
              <Text style={[styles.legendText, { flexWrap: "wrap" }]}>
                {type.split(" ").map((word, index) => (
                  <Text key={index}>
                    {word}
                    {"\n"}
                  </Text>
                ))}
              </Text>
            </View>
          ))}
        </View>

        {/* Selected Wings Flat Grid */}

        {selectedWing && (
          <Text style={styles.headingText}>Wing {selectedWing}</Text>
        )}

        {renderFlats()}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default BillDetailNew;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollcontainer: {
    margin: 16,
    flexGrow: 1,
    backgroundColor: "#DAD8C9",
    padding: 8,
    marginBottom: 80, // ✅ adds visible gap from bottom
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#6200ee", // Match background color from the attached image
    elevation: 4,
  },
  titleStyle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
    marginTop: 16,
    alignItems: "center",
  },
  toggleButton: {
    margin: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    height: 50, // Default height
    minWidth: 50, // Optional for consistency
    alignItems: "center", // Center content horizontally
    justifyContent: "center", // Center content vertically
  },
  selectedToggle: {
    backgroundColor: "#6200ee",
    height: 60, // Explicitly set a larger height for the selected button
    minWidth: 60, // Optional for a bigger width
    alignItems: "center", // Center content horizontally
    justifyContent: "center", // Center content vertically
  },
  toggleText: {
    fontWeight: "bold",
    textAlign: "center",
  },
  selectedtoggleText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    textAlign: "center",
  },
  flatList: {
    justifyContent: "center",
    alignItems: "center",
  },

  flatText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginBottom: 4,
    marginTop: 4,
  },
  billText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  headingText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 8,
  },
  scrollView: {
    flexGrow: 0,
  },
  outerscrollContent: {
    margin: 16,
    paddingHorizontal: 4,
    paddingTop: 8,
    backgroundColor: "#dddddd",

    borderWidth: 1, // Optional for outline
    borderColor: "#e0e0e0", // Optional for outline
    borderRadius: 8,
  },
  scrollContent: {
    flexDirection: "column", // Stack floors vertically
    paddingHorizontal: 16,
  },
  floorContainer: {
    marginBottom: 8,
  },
  floorTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row", // Flats in a row
  },
  flatContainer: {
    backgroundColor: "#4caf50",
    margin: 4,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },

  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    gap: 8, // Add spacing between legend items (React Native 0.71+)
  },
  legendItem: {
    alignItems: "center", // Center align both color and text
    marginHorizontal: 4, // Space between items
    marginBottom: 8, // Space between rows
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginBottom: 4, // Space between color box and text
  },
  legendText: {
    fontSize: 12, // Adjust text size as needed
    textAlign: "center",
  },
  legendcountContainer: {
    flexDirection: "row",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Dimmed background
  },
  modalContent: {
    width: "80%", // Adjust modal width
    backgroundColor: "#fff", // Modal background color
    borderRadius: 10, // Rounded corners
    padding: 20, // Inner padding
    alignItems: "center", // Center content horizontally
    shadowColor: "#000", // Shadow for iOS
    shadowOffset: { width: 0, height: 2 }, // Shadow position
    shadowOpacity: 0.25, // Shadow transparency
    shadowRadius: 4, // Shadow blur radius
    elevation: 5, // Shadow for Android
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row", // Arrange buttons horizontally
    justifyContent: "space-around", // Space between buttons
    width: "100%",
  },
  button: {
    padding: 10,
    borderRadius: 5,
    minWidth: 80,
    alignItems: "center",
  },
  buttonYes: {
    backgroundColor: "#2196F3", // Blue for Yes
  },
  buttonNo: {
    backgroundColor: "#FFA500", // Orange for No
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  closeButton: {
    position: "absolute",
    top: 5,
    right: 5,
    borderRadius: 20,
    padding: 5,
  },
});
