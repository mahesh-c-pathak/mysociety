
import React, {  useState } from "react";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import {  Avatar} from "react-native-paper";
import AppbarComponent from "@/components/AppbarComponent";
import AppbarMenuComponent from "@/components/AppbarMenuComponent";
import { useSociety } from "@/utils/SocietyContext";

import { db } from "@/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  deleteField,
  deleteDoc,
} from "firebase/firestore";

import { updateFlatCurrentBalance } from "@/utils/updateFlatCurrentBalance";
import { updateLedger } from "@/utils/updateLedger";

{
  /* update paid for section for bill amount and name */
}

const VoucherDetails = () => {
  const { societyName } = useSociety();
  const {
    wing,
    floor,
    flatNumber,
    type,
    amount,
    paymentDate,
    voucherNumber,
    paymentMode,
    transactionId,
    selectedIds,
    selectedBills,
    ledgerAccount,
    ledgerAccountGroup,
  } = useLocalSearchParams();
  //const parsedDetails = JSON.parse(voucherDetails); // Parse the stringified object
  const formattedvoucherNumber = voucherNumber as string;
  const formattedamount = amount as string;

  const voucherLedgerAccount = ledgerAccount as string;
  const voucherledgerAccountGroup = ledgerAccountGroup as string;

  const parsedselectedBills = JSON.parse(selectedBills as string);
  const parsedSelectedIds = JSON.parse(selectedIds as string);

  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;
  const customFlatsBillsSubcollectionName = `${societyName} bills`;

  const specialBillCollectionName = `specialBills_${societyName}`;

  const unclearedBalanceSubcollectionName = `unclearedBalances_${societyName}`;

  const totalAmountToPay = parsedselectedBills.reduce(
    (sum: number, bill: { amountToPay?: number }) =>
      sum + (bill.amountToPay || 0),
    0
  );

  const currentBalance = parseFloat(formattedamount) - totalAmountToPay;

  const currentDate = new Date().toISOString().split("T")[0];

  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDeleteVoucher = async (
    transactionId: string,
    voucherNumber: string
  ) => {
    console.log("transactionId", transactionId);
    Alert.alert(
      "Confirmation",
      "Are you sure to delete? You can't recover this data.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            console.log(`Deleting Voucher ${voucherNumber}`);
            setLoading(true);
            try {
              if (
                Array.isArray(parsedSelectedIds) &&
                parsedSelectedIds.length > 0
              ) {
                for (const item of parsedSelectedIds) {
                  console.log("Paid For bill No.", item);

                  const mainBillRef = `Societies/${societyName}/${specialBillCollectionName}/${item}`;
                  const mainBillDocRef = doc(db, mainBillRef);

                  const flatBillRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floor}/${customFlatsSubcollectionName}/${flatNumber}/${customFlatsBillsSubcollectionName}/${item}`;
                  const flatBillDocRef = doc(db, flatBillRef);

                  const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floor}/${customFlatsSubcollectionName}/${flatNumber}`;
                  const flatDocRef = doc(db, flatRef);

                  //const flatBillDocSnap = await getDoc(flatBillDocRef);

                  // Run both Firestore queries concurrently
                  const [mainBillDocSnap, flatBillDocSnap, flatDocSnap] =
                    await Promise.all([
                      getDoc(mainBillDocRef),
                      getDoc(flatBillDocRef),
                      getDoc(flatDocRef),
                    ]);

                  if (!flatDocSnap.exists()) {
                    console.warn(`Flat Data Not Exisits.`);
                    return;
                  }

                  const flatDetails = flatDocSnap.data();
                  const flatType = flatDetails.flatType;

                  if (!mainBillDocSnap.exists()) {
                    console.error("Main bill document does not exist.");
                    return;
                  }

                  const mainBillData = mainBillDocSnap.data();
                  const billItems = mainBillData?.items || [];

                  if (flatBillDocSnap.exists()) {
                    const flatBillDocData = flatBillDocSnap.data();
                    console.log("receiptAmount", flatBillDocData.receiptAmount);
                    // Prepare update object
                    const updatedData: any = {
                      status: "unpaid",
                    };

                    // Conditionally remove fields if they exist
                    const fieldsToRemove = [
                      "paymentDate",
                      "paymentMode",
                      "bankName",
                      "chequeNo",
                      "transactionId",
                      "voucherNumber",
                      "type",
                      "origin",
                      "note",
                      "paidledgerAccount",
                      "paidledgerGroup",
                      "receiptAmount", // Receipt amount should be removed if present
                      "overdueDays",
                      "penaltyAmount",
                      "ledgerAccountPenalty",
                      "ledgerAccountGroupPenalty",
                      "paidledgerAccount",
                      "paidledgerGroup",
                    ];

                    fieldsToRemove.forEach((field) => {
                      if (flatBillDocData.hasOwnProperty(field)) {
                        updatedData[field] = deleteField();
                      }
                    });

                    // Update Firestore document
                    await updateDoc(flatBillDocRef, updatedData);
                    console.log(`Bill ${item} reverted successfully`);

                    // Update bill item ledger receivable and cash/ bank ledger, for bill ledger check penalty

                    // items ledger receivable should be updated
                    for (const billSubItem of billItems) {
                      const amountledger =
                        flatType === "Closed"
                          ? billSubItem.closedUnitAmount
                          : flatType === "Rent"
                          ? billSubItem.rentAmount
                          : billSubItem.ownerAmount;

                      // Update item ledger and account receivable. Date is current date when voucher is deleted
                      const ledgerUpdateBillSubItem = await updateLedger(
                        societyName,
                        "Account Receivable",
                        billSubItem.updatedLedgerAccount,
                        amountledger,
                        "Add",
                        currentDate
                      );
                      console.log(
                        `Account Receivable for sub items Ledger Update Status: ${ledgerUpdateBillSubItem}`
                      );
                    } // end for bill sub item

                    // update penalty if exists
                    if (flatBillDocData.isEnablePenalty === "true") {
                      const penaltyAmount = flatBillDocData.penaltyAmount;
                      const billpaidLedgerAccount =
                        flatBillDocData.ledgerAccountPenalty;
                      const billpaidLedgerGroup =
                        flatBillDocData.ledgerAccountGroupPenalty;

                      const LedgerUpdatePenalty = await updateLedger(
                        societyName,
                        billpaidLedgerGroup,
                        billpaidLedgerAccount,
                        penaltyAmount,
                        "Subtract",
                        currentDate
                      ); // Update Ledger
                      console.log(
                        ` Penalty Ledger Update Status: ${LedgerUpdatePenalty}`
                      );
                    }

                    const LedgerUpdate = await updateLedger(
                      societyName,
                      flatBillDocData.paidledgerGroup,
                      flatBillDocData.paidledgerAccount,
                      flatBillDocData.receiptAmount,
                      "Subtract",
                      currentDate
                    ); // Update Ledger
                    console.log(LedgerUpdate);
                  } // if flatBillDocSnap exists
                } // end for
              }

              if (currentBalance > 0) {
                console.log("currentBalance", currentBalance);
                const operationType = type === "Refund" ? "Add" : "Subtract";

                // Logic to Update Current Balance for the Flat,  for refund need to "Add" as refund deleted means money came back
                const currentBalanceSubcollectionName = `currentBalance_${flatNumber}`;
                const currentbalanceCollectionRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floor}/${customFlatsSubcollectionName}/${flatNumber}/${currentBalanceSubcollectionName}`;
                const currentbalanceCollectionDocRef = collection(
                  db,
                  currentbalanceCollectionRef
                );
                const result = await updateFlatCurrentBalance(
                  currentbalanceCollectionDocRef,
                  currentBalance,
                  operationType,
                  currentDate
                );
                console.log("Current Balance update result:", result);

                // update ledger remove from "member Advanced" and bank/cash, for refund need to "Add"
                const result2 = await updateLedger(
                  societyName,
                  "Current Liabilities",
                  "Members Advanced",
                  currentBalance,
                  operationType,
                  currentDate
                ); // Update Ledger
                console.log("member Advanced update result:", result2);

                // for refund need to "Add"
                const result3 = await updateLedger(
                  societyName,
                  voucherledgerAccountGroup,
                  voucherLedgerAccount,
                  currentBalance,
                  operationType,
                  currentDate
                ); // Update Ledger

                console.log("bank / cash  update result:", result3);
              } // if currentBalance

              // Delete Unclread balance Doc
              const unclearedBalanceRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floor}/${customFlatsSubcollectionName}/${flatNumber}/${unclearedBalanceSubcollectionName}/${transactionId}`;
              const unclearedBalanceDocRef = doc(db, unclearedBalanceRef);
              await deleteDoc(unclearedBalanceDocRef);
              console.log(
                "Deleted unclearedBalance doc ",
                transactionId,
                "From Flat",
                flatNumber
              );
              Alert.alert("Success", "Voucher  deleted successfully.");
              router.replace({
                pathname: "/admin/Accounting/Reports/ReceiptSummary",
              });
            } catch (error) {
              console.error("Something went wrong", error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const [menuVisible, setMenuVisible] = useState(false);
  const handleMenuOptionPress = (option: string) => {
    console.log(`${option} selected`);
    if (option === "Delete") {
      handleDeleteVoucher(transactionId as string, voucherNumber as string);
    }
    setMenuVisible(false);
  };
  const closeMenu = () => {
    setMenuVisible(false);
  };

  return (
    <TouchableWithoutFeedback onPress={closeMenu}>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Top Appbar */}
        <AppbarComponent
          title={formattedvoucherNumber}
          source="Admin"
          onPressThreeDot={() => setMenuVisible(!menuVisible)}
        />

        {/* Three-dot Menu */}
        {/* Custom Menu */}
        {menuVisible && (
          <AppbarMenuComponent
            items={["Edit", "Delete"]}
            onItemPress={handleMenuOptionPress}
            closeMenu={closeMenu}
          />
        )}

        <View style={styles.header}>
          <View style={styles.profileContainer}>
            <Avatar.Text size={44} label="XD" style={styles.avatar} />
            <View style={styles.textContainer}>
              <Text style={styles.profileText}>
                {wing} {flatNumber}
              </Text>
              <Text style={styles.profileText}>
                {wing} {flatNumber}
              </Text>
            </View>
          </View>
        </View>

        {/* Transaction Info */}
        <View style={styles.infoContainer}>
          <View style={styles.rowContainer}>
            <View style={styles.content}>
              <Text style={styles.label}>Transaction ID: </Text>
              <Text style={[styles.transactionText, styles.amount]}>
                {transactionId}
              </Text>
            </View>
          </View>

          <View style={styles.rowContainer}>
            <View style={styles.content}>
              <Text style={styles.label}>Amount: </Text>
              <Text style={[styles.transactionText, styles.amount]}>
                ₹ {parseFloat(formattedamount).toFixed(2)}
              </Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.label}>Payment Mode: </Text>
              <Text style={styles.transactionText}>{paymentMode}</Text>
            </View>
          </View>
          <View style={styles.rowContainer}>
            <View style={styles.content}>
              <Text style={styles.label}>Payment Date: </Text>
              <Text style={styles.transactionText}>{paymentDate}</Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.label}>Receiver Name: </Text>
              <Text style={styles.transactionText}> Mahesh Pathak </Text>
            </View>
          </View>
        </View>

        {/* Payments Section */}

        {Array.isArray(parsedselectedBills) &&
          parsedselectedBills.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Payment For</Text>
              <View style={styles.paymentsContainer}>
                {parsedselectedBills.map((item, index) => (
                  <View key={index} style={styles.paymentRow}>
                    <Text style={styles.paymentDescription}>{item.id}</Text>
                    <Text style={styles.paymentAmountNegative}>
                      ₹ {item.amountToPay || "N/A"}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

        {/* Balance Section */}

        <View style={styles.balanceCard}>
          {type === "Advance" ? (
            <Text style={styles.balanceText}>
              Current Balance: ₹ {currentBalance.toFixed(2)}
            </Text>
          ) : type === "Refund" ? (
            <Text style={styles.balanceText}>
              Refund Amount: ₹ {currentBalance.toFixed(2)}
            </Text>
          ) : (
            <Text style={styles.balanceText}>
              Current Balance: ₹ {currentBalance.toFixed(2)}
            </Text>
          )}
        </View>

        {/* Download Button */}
        <TouchableOpacity style={styles.downloadButton}>
          <Text style={styles.downloadButtonText}>Download</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default VoucherDetails;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerCard: { backgroundColor: "#673AB7", padding: 16, borderRadius: 8 },
  headerContent: { flexDirection: "row", alignItems: "center" },
  content: { alignItems: "flex-start", justifyContent: "center" },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  flatText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  nameText: { fontSize: 16, color: "#fff", marginTop: 4 },
  contactText: { fontSize: 14, color: "#EDE7F6", marginTop: 2 },
  infoContainer: { padding: 16 },
  transactionText: { fontSize: 14, marginBottom: 8, color: "#333" },
  label: { fontWeight: "bold" },
  amount: { color: "#4CAF50", fontWeight: "bold" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    color: "#333",
    marginLeft: 12,
  },
  paymentsContainer: {
    padding: 16,
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentDescription: { fontSize: 14, color: "#333" },
  paymentAmountNegative: { fontSize: 14, color: "#F44336", fontWeight: "bold" },
  invoiceText: { fontSize: 12, color: "#757575", marginTop: 4 },
  divider: { marginVertical: 8 },
  // balanceCard: { backgroundColor: "#E0E0E0", padding: 16, alignItems: "center", marginTop: 16,  },
  balanceCard: {
    backgroundColor: "#fff",
    padding: 16,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
    alignSelf: "center", // Centers the view horizontally
    borderRadius: 2, // Optional: Adds rounded corners
    minWidth: 150, // Ensures it doesn't collapse too much
    borderWidth: 1,
  },
  balanceText: { fontSize: 16, fontWeight: "bold", color: "#333" },

  appbar: {
    backgroundColor: "#5e35b1", // Consistent background color
    elevation: 0, // Removes shadow
  },
  titleStyle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  avatar: {
    backgroundColor: "#7e57c2", // Match avatar background
    marginRight: 10,
  },
  textContainer: {
    justifyContent: "center",
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  profileText: {
    fontSize: 14,
    color: "#d1c4e9",
  },
  header: {
    backgroundColor: "#6200ee",
    paddingHorizontal: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  downloadButton: {
    backgroundColor: "#673AB7",
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: "center", // Centers horizontally
    borderRadius: 8,
    marginTop: 16,
    minWidth: 100, // Ensures it doesn't shrink too much
    alignItems: "center", // Centers text inside
  },
  downloadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
