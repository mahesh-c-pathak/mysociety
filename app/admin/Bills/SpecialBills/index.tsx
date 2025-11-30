import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  Pressable,
  TouchableWithoutFeedback,
} from "react-native";
import { Button, FAB, Divider } from "react-native-paper";
import { useRouter } from "expo-router";

import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import AppbarComponent from "@/components/AppbarComponent";
import MenuComponent from "@/components/AppbarMenuComponent";
import { useSociety } from "@/utils/SocietyContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";
import DateRangePicker from "@/components/DateRangePicker";
import { getCurrentFinancialYear } from "@/utils/financialYearHelpers";

interface BillData {
  id: string;
  title: string;
  date: string;
  unpaidAmount: number;
  paidAmount: number;
  createdBy: string;
}

const GenerateSpecialBills = () => {
  const insets = useSafeAreaInsets();
  const { societyName } = useSociety();
  // const [startDate, setStartDate] = useState("");
  // const [endDate, setEndDate] = useState("");
  const router = useRouter();
  useCustomBackHandler("/admin/Bills"); // back always goes to Screen3

  // const customFlatsBillsSubcollectionName = `${societyName} bills`;

  // const customFlatsBillsSubcollectionName = "flatbills";

  //const specialBillCollectionName = `specialBills_${societyName}`;
  // const customWingsSubcollectionName = `${societyName} wings`;
  //const customFloorsSubcollectionName = `${societyName} floors`;
  // const customFlatsSubcollectionName = `${societyName} flats`;

  const { startDate, endDate } = getCurrentFinancialYear(); // returns start and end of current FY

  // Get the current date and set it to the 1st of the current month
  const getFirstDayOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  };
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());

  const [toDate, setToDate] = useState(new Date(Date.now()));

  const [bills, setBills] = useState<BillData[]>([]);

  useEffect(() => {
    fetchBills(fromDate, toDate);
  }, []);

  const fetchBills = async (from: Date, to: Date) => {
    console.log("societyName", societyName);
    try {
      // 1. Query master bills
      const billsRef = collection(db, "Bills");

      const q = query(
        billsRef,
        where("societyName", "==", societyName),
        where("billType", "==", "Special Bill"),
        where("createdAt", ">=", from),
        where("createdAt", "<=", to),
        orderBy("createdAt", "desc")
      );

      const billsSnapshot = await getDocs(q);

      const finalBills: BillData[] = [];

      // 2. Loop each bill
      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();

        // Safety
        if (!bill.members || !bill.billNumbers) continue;

        const {
          invoiceDate,
          name,
          createdBy,
          totalBillAmount,
          totalPaidAmount,
        } = bill;
        const totalUnpaidAmount = totalBillAmount - totalPaidAmount;

        // 5. Push final bill card data
        finalBills.push({
          id: billDoc.id,
          title: name,
          date: invoiceDate,
          paidAmount: totalPaidAmount,
          unpaidAmount: totalUnpaidAmount,
          createdBy,
        });
      }

      // 6. Update state once
      setBills(finalBills);
    } catch (error) {
      console.error("Error fetching bills:", error);
    }
  };

  const renderBill = ({ item }: { item: BillData }) => (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/admin/Bills/SpecialBills/BillDetailNew",
          params: { title: item.title, id: item.id },
        })
      }
    >
      <View style={styles.billCardContainer}>
        <View style={styles.billCardInner}>
          <Text style={styles.billTitle}>{item.title}</Text>

          {/* Row: Date + User */}
          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <Text style={styles.icon}>📅</Text>
              <Text style={styles.dateText}>{item.date}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.icon}>👤</Text>
              <Text style={styles.personText}>{item.createdBy}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* PAID / UNPAID / TOTAL */}
          <View style={styles.amountRow}>
            <View style={styles.amountBlock}>
              <Text style={styles.amountLabel}>PAID</Text>
              <Text style={styles.paidAmount}>₹{item.paidAmount}</Text>
            </View>
            <View style={styles.verticalDivider} />

            <View style={styles.amountBlock}>
              <Text style={styles.amountLabel}>UNPAID</Text>
              <Text style={styles.unpaidAmount}>₹{item.unpaidAmount}</Text>
            </View>
            <View style={styles.verticalDivider} />

            <View style={styles.amountBlock}>
              <Text style={styles.amountLabel}>TOTAL</Text>
              <Text style={styles.totalAmount}>
                ₹{item.paidAmount + item.unpaidAmount}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );

  const [menuVisible, setMenuVisible] = useState(false);

  const handleMenuOptionPress = (option: string) => {
    console.log(`${option} selected`);
    setMenuVisible(false);
  };
  const closeMenu = () => {
    setMenuVisible(false);
  };

  return (
    <TouchableWithoutFeedback onPress={closeMenu}>
      <View style={styles.container}>
        {/* Top Appbar */}
        <AppbarComponent
          title="Generate Special Bills"
          source="Admin"
          onPressThreeDot={() => setMenuVisible(!menuVisible)} // Toggle menu visibility
          backRoute="/admin/Bills" // 👈 ensures same behavior as custom back handler
        />

        {/* Three-dot Menu */}
        {/* Custom Menu */}
        {menuVisible && (
          <MenuComponent
            items={["Download PDF", "Download Excel"]}
            onItemPress={handleMenuOptionPress}
            closeMenu={closeMenu}
          />
        )}

        {/* Date Range Inputs */}

        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          setFromDate={setFromDate}
          setToDate={setToDate}
          onGoPress={() => fetchBills(fromDate, toDate)} // 👈 refresh on Go
          minimumDate={new Date(startDate)}
          maximumDate={new Date(endDate)}
        />
        <Divider />

        {/* Bill Card */}
        <FlatList
          data={bills}
          renderItem={renderBill}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No Bills to display</Text>
          }
        />

        {/* Bill Collection Button */}
        <View style={[styles.footer, { bottom: insets.bottom }]}>
          <Button
            mode="contained"
            onPress={() => {}}
            style={styles.footerButton}
          >
            Bill Collection
          </Button>

          {/* Floating Action Button */}
          <FAB
            icon="plus"
            color="white" // Set the icon color to white
            style={[styles.fab, { bottom: insets.bottom + 60 }]}
            onPress={() =>
              router.push(
                "/admin/Bills/SpecialBills/SpecialBillTypes/create-bill"
              )
            } // Example route for adding a bill
          />
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    backgroundColor: "#6200ee",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 16,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0, // 👈 ensures it's always visible at bottom
    backgroundColor: "#fff",
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  footerButton: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: "green",
  },

  billCardContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },

  billCardInner: {
    flexDirection: "column",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },

  billTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },

  icon: {
    marginRight: 6,
    fontSize: 16,
  },

  dateText: {
    color: "#555",
    fontSize: 14,
  },

  personText: {
    color: "#555",
    fontSize: 14,
  },

  divider: {
    height: 1,
    backgroundColor: "#ddd",
    marginVertical: 12,
  },

  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  amountBlock: {
    alignItems: "center",
    flex: 1,
  },

  amountLabel: {
    color: "#777",
    fontSize: 12,
  },

  paidAmount: {
    color: "green",
    fontWeight: "bold",
    marginTop: 4,
  },

  unpaidAmount: {
    color: "red",
    fontWeight: "bold",
    marginTop: 4,
  },

  totalAmount: {
    color: "black",
    fontWeight: "bold",
    marginTop: 4,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: "#ccc",
    marginHorizontal: 12,
  },
});

export default GenerateSpecialBills;
