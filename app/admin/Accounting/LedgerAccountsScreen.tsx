import React, { useState, useEffect } from "react";
import { View, StyleSheet, SectionList, TouchableOpacity } from "react-native";
import { Text, FAB, ActivityIndicator, Button, Appbar } from "react-native-paper";
import { useRouter } from "expo-router";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import PaymentDatePicker from "@/utils/paymentDate";
import { useSociety } from "@/utils/SocietyContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LedgerAccountsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [sectionedAccounts, setSectionedAccounts] = useState<{ title: string; data: { account: string; amount: number }[] }[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { societyName } = useSociety();
  const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`;
  const accountsCollectionName = `accounts_${societyName}`;
  const balancesCollectionName = `balances_${societyName}`;


  const fetchLatestBalanceBeforeDate = async (groupId: string, accountId: string, date: string) => {
    const balancesCollection = collection(db, "Societies", societyName, ledgerGroupsCollectionName, groupId, accountsCollectionName, accountId, balancesCollectionName);
    const q = query(balancesCollection, where("date", "<=", date), orderBy("date", "desc"), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      return data.cumulativeBalance ?? 0; // Use cumulativeBalance or default to 0
    }
    return 0; // Default to 0 if no balance is found
  };
 
  useEffect(() => {
    const fetchLedgerGroups = async () => {
      setLoading(true);
      try {
        const ledgerGroupsSnapshot = await getDocs(collection(db, "Societies", societyName, ledgerGroupsCollectionName));
        const groupPromises = ledgerGroupsSnapshot.docs.map(async (groupDoc) => {
          const groupId = groupDoc.id;
          const accountsSnapshot = await getDocs(collection(db, "Societies", societyName, ledgerGroupsCollectionName, groupId, accountsCollectionName));
          
          const accountPromises = accountsSnapshot.docs.map(async (accountDoc) => {
            const accountId = accountDoc.id;
            const dateString = selectedDate.toISOString().split('T')[0];
            const balance = await fetchLatestBalanceBeforeDate(groupId, accountId, dateString);
            return { account: accountId, amount: balance };
          });
  
          const accounts = await Promise.all(accountPromises);
          return { title: groupId, data: accounts };
        });
  
        const sections = await Promise.all(groupPromises);
        setSectionedAccounts(sections.filter(section => section.data.length > 0));
        setExpandedSections(sections.reduce((acc, section) => ({ ...acc, [section.title]: true }), {}));
      } catch (error) {
        console.error("Error fetching ledger groups:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchLedgerGroups();
  }, [selectedDate]);
  
  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Appbar */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content title="Ledger Accounts" titleStyle={styles.titleStyle} />
      </Appbar.Header>
      <View style={styles.headerview}>
        <View style={styles.section}>
          <Text style={styles.label}>As on Date</Text>
          <PaymentDatePicker
            initialDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </View>
        <Button mode="contained" style={styles.goButton} onPress={() => setSelectedDate(new Date(selectedDate))}>
          Go
        </Button>
      </View>

      <SectionList
        sections={sectionedAccounts}
        keyExtractor={(item, index) => index.toString()}
        renderSectionHeader={({ section: { title } }) => (
          <TouchableOpacity onPress={() => toggleSection(title)} style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </TouchableOpacity>
        )}
        renderItem={({ item, section }) =>
          expandedSections[section.title] ? (
            <View style={styles.inlineItem}>
              <Text style={styles.accountName}>{`   ${item.account}`}</Text>
              <Text style={styles.accountAmount}>₹ {item.amount.toFixed(2)}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No accounts to display</Text>}
        contentContainerStyle={{
    paddingBottom: insets.bottom + 100, // 👈 add enough gap for footer + FAB
  }}
      />

      <View
        style={[
          styles.footer,
          { bottom: insets.bottom },
        ]}
      >
      <FAB
       style={styles.fab} 
       icon="plus" 
       onPress={() => router.push("/admin/Accounting/AddLedgerAccountScreen")} 
       color="white" // Set the icon color to white
       />
       </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: { backgroundColor: "#6200ee" },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerview: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
  },
  goButton: {
    backgroundColor: "#4caf50",
  },
  sectionHeader: {
    backgroundColor: "#eaeaea",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  inlineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  accountName: {
    fontSize: 14,
  },
  accountAmount: {
    fontSize: 14,
    fontWeight: "bold",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#6200ee",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 16,
  },
  section: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
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

export default LedgerAccountsScreen;
