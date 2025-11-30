import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  Pressable,
  TouchableWithoutFeedback,
} from "react-native";
import { Button, Card, Divider, FAB, Surface } from "react-native-paper";
import { useRouter } from "expo-router";

import {
  getDocs,
  collectionGroup,
  query,
  where,
  collection,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import AppbarComponent from "@/components/AppbarComponent";
import MenuComponent from "@/components/AppbarMenuComponent";
import { useSociety } from "@/utils/SocietyContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCurrentFinancialYear } from "@/utils/financialYearHelpers";
import DateRangePicker from "@/components/DateRangePicker";

interface BillData {
  id: string;
  title: string;
  date: string;
  unpaidAmount: number;
  paidAmount: number;
}

const GenerateScheduledBills = () => {
  const insets = useSafeAreaInsets();
  const { societyName } = useSociety();
  const router = useRouter();
  // const [datesReady, setDatesReady] = useState(false);

  const { startDate, endDate } = getCurrentFinancialYear(); // returns start and end of current FY
  // Get the current date and set it to the 1st of the current month
  const getFirstDayOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  };
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());

  const [toDate, setToDate] = useState(new Date(Date.now()));

  const [bills, setBills] = useState<BillData[]>([]);

  // 🔹 Go button handler

  useEffect(() => {
    fetchBills(fromDate, toDate);
  }, []);

  const fetchBills = async (from: Date, to: Date) => {
    console.log("societyName from fetchBills", societyName);
    try {
      // const scheduledBillChildCollectionName = `scheduledBillsChilds_${societyName}`;
      //const customFlatsBillsSubcollectionName = `${societyName} bills`;

      const customFlatsBillsSubcollectionName = "flatbills";

      // Fetch bills from the "bills" collection

      const billsRef = collection(db, "Bills");

      const fromISO = from.toISOString();
      const toISO = to.toISOString();

      // ✅ Query: Only "Special Bill" & order by createdAt descending
      const q = query(
        billsRef,
        where("societyName", "==", societyName),
        where("billType", "==", "Scheduled Bill"),
        where("createdAt", ">=", fromISO),
        where("createdAt", "<=", toISO),
        orderBy("createdAt", "desc")
      );
      const billsSnapshot = await getDocs(q);

      const billsData: BillData[] = [];

      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();
        const { billNumber, startDate, name } = bill;

        let unpaidAmount = 0;
        let paidAmount = 0;

        // 🔹 Match flats’ bills by billNumber
        const customFlatsBillsSubcollectionNameQuery = query(
          collectionGroup(db, customFlatsBillsSubcollectionName),
          where("societyName", "==", societyName)
        );

        const flatsBillSnapshot = await getDocs(
          customFlatsBillsSubcollectionNameQuery
        );

        flatsBillSnapshot.forEach((doc) => {
          if (doc.id === billNumber) {
            const billsPerFlatData = doc.data();
            const amount = billsPerFlatData.amount;
            const status = billsPerFlatData.status;

            if (status === "unpaid" || status === "Pending Approval") {
              unpaidAmount += amount;
            } else if (status === "paid") {
              paidAmount += amount;
            }
          }
        });

        billsData.push({
          id: billDoc.id,
          title: name,
          date: startDate,
          unpaidAmount,
          paidAmount,
        });
      }

      // 🔹 Sort bills by date (latest first)
      billsData.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setBills(billsData);
    } catch (error) {
      console.error("Error fetching bills:", error);
    }
  };

  const renderBill = ({ item }: { item: BillData }) => (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/admin/Bills/Maintenance/BillDetailNew",
          params: { title: item.title, id: item.id },
        })
      }
    >
      <Surface style={styles.billCard}>
        <Card>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.billTitle}>{item.title}</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.paidAmount}>
                  ₹ {item.paidAmount.toFixed(2)}
                </Text>
                <Text style={styles.unpaidAmount}>
                  ₹ {item.unpaidAmount.toFixed(2)}
                </Text>
              </View>
            </View>
            <Text style={styles.billDate}>{item.date}</Text>
            <Text style={styles.billCreator}>Created By: Mahesh Pathak</Text>
          </Card.Content>
        </Card>
      </Surface>
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
          title="Generate Maintenance Bills"
          source="Admin"
          onPressThreeDot={() => setMenuVisible(!menuVisible)} // Toggle menu visibility
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
          contentContainerStyle={{ paddingBottom: 80 }}
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
            style={styles.fab}
            onPress={() =>
              router.push(
                "/admin/Bills/Maintenance/MaintenanceBillTypes/Schedules"
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
  billCard: {
    elevation: 2,
    borderRadius: 8,
    marginBottom: 20,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  paidAmount: {
    color: "#6200ee",
    fontWeight: "bold",
    marginRight: 10,
  },
  unpaidAmount: {
    color: "red",
    fontWeight: "bold",
  },
  billDate: {
    marginTop: 10,
    color: "gray",
  },
  billCreator: {
    color: "gray",
    marginTop: 5,
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
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
});

export default GenerateScheduledBills;
