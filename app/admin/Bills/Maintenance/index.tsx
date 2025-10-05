import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  Pressable,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from "react-native";
import { Button, Card, FAB, Surface } from "react-native-paper";
import { useRouter } from "expo-router";
import PaymentDatePicker from "@/utils/paymentDate";

import { getDocs, collectionGroup, query, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import AppbarComponent from "@/components/AppbarComponent";
import MenuComponent from "@/components/AppbarMenuComponent";
import { useSociety } from "@/utils/SocietyContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCurrentFinancialYear } from "@/utils/financialYearHelpers";
import { formatDate } from "../../../../utils/dateFormatter";

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
  const [fromDate, setFromDate] = useState(new Date(Date.now()));
  const [toDate, setToDate] = useState(new Date(Date.now()));
  const router = useRouter();
  const [datesReady, setDatesReady] = useState(false);

  // const customFlatsBillsSubcollectionName = `${societyName} bills`;

  // const scheduledBillCollectionName = `scheduledBills_${societyName}`;

  const [bills, setBills] = useState<BillData[]>([]);
  useEffect(() => {
    // Set initial state for current financial year
    const { startDate, endDate } = getCurrentFinancialYear();
    setFromDate(new Date(startDate));
    setToDate(new Date(endDate)); // 👈 always today
    setDatesReady(true);
  }, []);

  // 🔹 Initial fetch (only after datesReady is set)
  useEffect(() => {
    if (societyName && datesReady) {
      console.log("Fetching with range:", fromDate, toDate);
      fetchBills(fromDate, toDate);
    }
  }, [societyName, datesReady]);

  // 🔹 Go button handler
  const handleGoPress = () => {
    fetchBills(fromDate, toDate);
  };

  const fetchBills = async (from: Date, to: Date) => {
    console.log("societyName from fetchBills", societyName);
    try {
      const scheduledBillChildCollectionName = `scheduledBillsChilds_${societyName}`;
      const customFlatsBillsSubcollectionName = `${societyName} bills`;

      // 🔹 Filter by startDate between from & to
      const billsQuery = query(
        collectionGroup(db, scheduledBillChildCollectionName),
        where("startDate", ">=", formatDate(from)),
        where("startDate", "<=", formatDate(to))
      );

      const billsSnapshot = await getDocs(billsQuery);

      const billsData: BillData[] = [];

      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();
        const { billNumber, startDate, name } = bill;

        let unpaidAmount = 0;
        let paidAmount = 0;

        // 🔹 Match flats’ bills by billNumber
        const flatsBillSnapshot = await getDocs(
          collectionGroup(db, customFlatsBillsSubcollectionName)
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

        {/* Date Inputs */}
        <View style={styles.dateInputsContainer}>
          <View style={styles.section}>
            <PaymentDatePicker
              initialDate={fromDate}
              onDateChange={setFromDate}
            />
          </View>
          <View style={styles.section}>
            <PaymentDatePicker initialDate={toDate} onDateChange={setToDate} />
          </View>

          <TouchableOpacity style={styles.goButton} onPress={handleGoPress}>
            <Text style={styles.goButtonText}>Go</Text>
          </TouchableOpacity>
        </View>

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
  anchor: { position: "absolute", top: 0, right: 0 }, // Adjust position as needed
  dateInputs: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dateInput: {
    flex: 1,
    marginHorizontal: 5,
  },
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
  billCollectionButton: {
    backgroundColor: "green",
    position: "absolute",
    bottom: 2,
    left: 10,
    right: 10,
    borderRadius: 5,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#6200ee",
  },
  menuIcon: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  customMenu: {
    position: "absolute",
    top: 50,
    right: 10,
    backgroundColor: "white",
    borderRadius: 8,
    elevation: 5,
    padding: 10,
    zIndex: 1,
  },
  menuItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: 5,
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
  dateInputsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  goButton: {
    backgroundColor: "#808080",
    justifyContent: "center", // Center text vertically
    alignItems: "center", // Center text horizontally
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  goButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  section: { flex: 1, margin: 5 },
});

export default GenerateScheduledBills;
