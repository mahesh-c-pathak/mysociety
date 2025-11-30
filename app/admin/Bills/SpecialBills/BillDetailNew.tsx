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
  flatbillNumber: string;
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
  // console.log("master bill id", id);
  const router = useRouter();
  const { societyName: mysocietyName } = useSociety();
  const [loading, setLoading] = useState(true);

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

  // console.log("flatsData", flatsData);

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
              flatbillNumber: string;
            }
          >
        >
      > = {};

      flatsBillSnapshot.forEach((doc) => {
        const billsData = doc.data();
        const flatbillNumber = doc.id;
        const billStatus = billsData.status as string; // Ensure it's a string
        const billDueDate = billsData.dueDate;
        const billAmount = billsData.amount || 0; // Default to 0 if amount is missing
        const billsPath = doc.ref.path;
        const pathSegments = billsPath.split("/");
        // console.log("billsPath", billsPath);

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
          flatbillNumber,
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
          flatbillNumber: billInfo.flatbillNumber,
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
    billStatus: string,
    flatbillNumber: string
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
        billNumber: flatbillNumber,
        flatType,
        billStatus,
        id,
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
                      flatData.billStatus,
                      flatData.flatbillNumber // <-- NEW
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

  const [menuVisible, setMenuVisible] = useState(false);

  const handleDeleteBillNew = async () => {
    Alert.alert(
      "Confirmation",
      "Are you sure to delete? You can't recover this data.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              setLoading(true);
              const mainBillRef = `Bills/${id}`;
              const mainBillDocRef = doc(db, mainBillRef);
              const billsSnapshot = await getDoc(mainBillDocRef);
              if (!billsSnapshot.exists()) {
                console.warn("mainBillDocSnap does not exist.");
                return;
              }

              const billsData = billsSnapshot.data();

              const { flatPaths, billNumbers } = billsData;

              for (let i = 0; i < flatPaths.length; i++) {
                const flatRef = flatPaths[i];

                const billId = billNumbers[i];

                const flatBillPathRef = `${flatRef}/${customFlatsBillsSubcollectionName}/${billId}`;
                const flatBillDocRef = doc(db, flatBillPathRef);
                const flatBillDocSnap = await getDoc(flatBillDocRef);
                if (!flatBillDocSnap.exists()) {
                  console.warn("Flat bill does NOT exist:", flatBillPathRef);
                  continue; // skip this entry
                }

                const flatBillDetails = flatBillDocSnap.data();

                const status = flatBillDetails.status;
                const isEnablePenalty = flatBillDetails.isEnablePenalty;

                if (status === "unpaid") {
                  const billTotals = flatBillDetails.billItemTotals || {};
                  for (const key in billTotals) {
                    const [ledgerGroup, ledgerAccount] = key.split("||");
                    const amount = billTotals[key];
                    const ledgerAccountReceivables = `${ledgerAccount} Receivables`;

                    // 1. Reverse the income/expense ledger
                    const itemledgerUpdate = await updateLedger(
                      mysocietyName,
                      ledgerGroup,
                      ledgerAccount,
                      amount,
                      "Subtract",
                      currentDate
                    );
                    console.log(
                      `Item Ledger Update Status: ${itemledgerUpdate}`
                    );

                    // 2. Reverse the Account Receivable entry
                    const ledgerUpdateReceivables = await updateLedger(
                      mysocietyName,
                      "Account Receivable",
                      ledgerAccountReceivables, // OR a constant AR account if you use one
                      amount,
                      "Subtract",
                      currentDate
                    );
                    console.log(
                      `Account Receivable Ledger Update Status: ${ledgerUpdateReceivables}`
                    );
                  }
                } else if (status === "paid") {
                  // Handle paid status
                  const billTotals = flatBillDetails.billItemTotals || {};

                  for (const key in billTotals) {
                    const [ledgerGroup, ledgerAccount] = key.split("||");
                    const amount = billTotals[key];

                    // Only reverse item  ledger
                    const paidStatusledgerUpdate = await updateLedger(
                      mysocietyName,
                      ledgerGroup,
                      ledgerAccount,
                      amount,
                      "Subtract",
                      currentDate
                    );
                    console.log(
                      ` paid status item Ledger Update Status: ${paidStatusledgerUpdate}`
                    );
                  }

                  // update penalty if exists
                  if (isEnablePenalty) {
                    const penaltyAmount = billsData.penaltyAmount;
                    const billpaidLedgerAccount =
                      billsData.ledgerAccountPenalty;
                    const billpaidLedgerGroup =
                      billsData.ledgerAccountGroupPenalty;

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
                  } // end if isenablepenalty
                  // Update Unclread balance selectedBills and selectedIds
                  const transactionId = flatBillDetails.transactionId;
                  const unclearedBalanceRef = `${flatRef}/${unclearedBalanceSubcollectionName}/${transactionId}`;
                  const unclearedBalanceDocRef = doc(db, unclearedBalanceRef);
                  const docSnap = await getDoc(unclearedBalanceDocRef);
                  let amountReceived = 0;

                  if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Bill number to delete
                    const billToDelete = billId;
                    amountReceived = data.amountReceived;

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
                    // Add the deleted Amount to current Balance
                    const receiptAmount = amountReceived;
                    // const currentBalanceSubcollectionName = `currentBalance_${flat}`;
                    const currentBalanceSubcollectionName =
                      "flatCurrentBalance";
                    const currentbalanceCollectionRef = `${flatRef}/${currentBalanceSubcollectionName}`;
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
                } // end else if status

                await deleteDoc(flatBillDocRef);
                console.log("Deleted Bill", "From Flat");
              } // end for flatPath
              // After flat bills delete main bill

              await deleteDoc(mainBillDocRef);
              // After delete route to "Generate special bill index screen /(SpecialBills) "
              Alert.alert("Success", "All Bills  deleted successfully.");
              router.replace({
                pathname: "/admin/Bills/SpecialBills",
              });
            } catch (error) {
              console.error("Something went wrong", error);
            } finally {
              setLoading(false);
            }
          }, // end onPress
        },
      ]
    ); // end alert
  }; // end handleDeleteBillNew

  const handleMenuOptionPress = (option: string) => {
    console.log(`${option} selected`);
    if (option === "Delete") {
      handleDeleteBillNew();
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
  scrollContent: {
    flexDirection: "column", // Stack floors vertically
    paddingHorizontal: 16,
  },
  floorContainer: {
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
});
