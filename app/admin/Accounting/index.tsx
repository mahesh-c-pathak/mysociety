import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { Text, IconButton, FAB, Card, Appbar } from "react-native-paper";
import { useRouter } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDate } from "@/utils/dateFormatter";
import {
  fetchBalanceForDate,
  fetchLatestBalanceBeforeDate,
} from "@/utils/fetchbalancefromdatabase";
import { useSociety } from "@/utils/SocietyContext";
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { fetchbankCashAccountOptions } from "@/utils/bankCashOptionsFetcher";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";
import { globalStyles } from "@/styles/globalStyles";

interface GridItem {
  label: string;
  icon: string;
  route?: string;
  value?: string;
  valueType?: string;
}

const BalanceSheetScreen = () => {
  const router = useRouter();
  const { societyName, isAdditionalBankCash } = useSociety();
  const insets = useSafeAreaInsets();
  useCustomBackHandler("/admin");

  const acountIndexGridCollectionName = `acountIndexGrid_${societyName}`; // acountIndexGrid_Happy home

  const gridDataList = [
    {
      label: "Ledger Accounts",
      icon: "book",
      route: "/admin/Accounting/LedgerAccountsScreen",
    },
    {
      label: "Vouchers",
      icon: "file-document",
      route: "/admin/Accounting/Vouchers",
    },
    {
      label: "Transactions",
      icon: "eye",
      route: "/admin/Accounting/TransactionScreen",
    },
    {
      label: "Reports",
      icon: "chart-line",
      route: "/admin/Accounting/Reports",
    },
    { label: "Opening Balances", icon: "pencil" },
    {
      label: "Cash",
      icon: "file-document",
      route: "/admin/Accounting/Reports/CashBooks/Cash",
    },
    {
      label: "Bank",
      icon: "file-document",
      route: "/admin/Accounting/Reports/BankBooks/Bank",
    },
  ];

  const [gridData, setGridData] = useState<GridItem[]>(gridDataList);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [loadingFirestore, setLoadingFirestore] =
    useState(isAdditionalBankCash);

  // 2️⃣ Fetch balances
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const formattedDate = formatDate(new Date());

        const { accountFromOptions } =
          await fetchbankCashAccountOptions(societyName);
        const bankCashAccounts = accountFromOptions.filter((opt) =>
          ["Bank Accounts", "Cash in Hand"].includes(opt.group)
        );

        const balancePromises = bankCashAccounts.map(async (account) => {
          let balance = await fetchBalanceForDate(
            societyName,
            account.group,
            account.label,
            formattedDate
          );
          if (balance === 0) {
            balance = await fetchLatestBalanceBeforeDate(
              societyName,
              account.group,
              account.label,
              formattedDate
            );
          }
          return { label: account.label?.trim(), balance };
        });

        const balances = await Promise.all(balancePromises);

        // Map balances for quick lookup
        const balancesMap = new Map(
          balances.map((b) => [b.label?.toLowerCase(), b.balance])
        );

        // Merge into grid
        setGridData((prev) =>
          prev.map((item) => {
            const match = item.label
              ? balancesMap.get(item.label.toLowerCase())
              : undefined;
            return match !== undefined
              ? { ...item, value: match.toFixed(2) }
              : item;
          })
        );
      } catch (err) {
        console.error("Error fetching balances:", err);
      } finally {
        setLoadingBalances(false);
      }
    };

    fetchBalances();
  }, [societyName]);

  // 3️⃣ Fetch optional Firestore grid items
  useEffect(() => {
    if (!isAdditionalBankCash) return;

    const fetchFirestoreGrid = async () => {
      try {
        const gridDataRef = collection(
          db,
          "Societies",
          societyName,
          acountIndexGridCollectionName
        );
        const snapshot = await getDocs(gridDataRef);
        const firestoreItems = snapshot.docs.map(
          (doc) => doc.data() as GridItem
        );

        // Deduplicate
        const localLabels = new Set(gridData.map((i) => i.label?.trim()));
        const filteredFirestore = firestoreItems.filter(
          (i) => !localLabels.has(i.label?.trim())
        );

        // Merge
        setGridData((prev) => [...prev, ...filteredFirestore]);
      } catch (err) {
        console.error("Error fetching Firestore grid:", err);
      } finally {
        setLoadingFirestore(false);
      }
    };

    fetchFirestoreGrid();
  }, [isAdditionalBankCash, societyName]);

  // 4️⃣ Show loading spinner only if both data sources are fetching
  if (loadingBalances && loadingFirestore) return <LoadingIndicator />;

  return (
    <View style={globalStyles.container}>
      {/* Top Appbar */}
      <Appbar.Header style={globalStyles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content
          title="Balance Sheet"
          titleStyle={globalStyles.titleStyle}
        />
      </Appbar.Header>

      {/** */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.titleRow}>
            <Text style={globalStyles.sectionTitle}>Main Balance</Text>
            <IconButton
              icon="dots-vertical"
              size={20}
              style={styles.iconButton}
            />
          </View>
          <FlatList
            data={gridData}
            keyExtractor={(item, index) => `${item.label}_${index}`}
            numColumns={4}
            contentContainerStyle={{ paddingBottom: 20, padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => item.route && router.push(item.route as any)}
              >
                <IconButton icon={item.icon} size={24} />
                <Text style={styles.gridLabel}>{item.label}</Text>
                {item.value && (
                  <Text style={styles.gridValue}>{item.value}</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </Card.Content>
      </Card>

      {/* Floating Action Button */}
      <View style={[globalStyles.footer, { bottom: insets.bottom }]}>
        <FAB
          style={globalStyles.fab}
          icon="plus"
          color="white" // Set the icon color to white
          onPress={() => {
            // Handle FAB action
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    borderRadius: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 8, // Add padding to align content inside the card
  },

  iconButton: {
    margin: 0, // Remove unnecessary margins to keep the icon aligned properly
  },
  gridItem: {
    width: "22%",
    alignItems: "center",
    marginVertical: 8,
  },
  gridLabel: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 12,
  },
  gridValue: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 12,
    color: "#6200ee",
  },
});

export default BalanceSheetScreen;
