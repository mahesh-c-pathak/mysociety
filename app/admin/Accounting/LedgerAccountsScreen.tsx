import React, { useState, useEffect } from "react";
import { View, SectionList, TouchableOpacity } from "react-native";
import {
  Text,
  FAB,
  ActivityIndicator,
  Button,
  Appbar,
} from "react-native-paper";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import PaymentDatePicker from "@/utils/paymentDate";
import { useSociety } from "@/utils/SocietyContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { globalStyles } from "@/styles/globalStyles";
import { fetchBalanceForDate } from "@/utils/fetchbalancefromdatabase";

const LedgerAccountsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [sectionedAccounts, setSectionedAccounts] = useState<
    { title: string; data: { account: string; amount: number }[] }[]
  >([]);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { societyName } = useSociety();
  const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`;
  const accountsCollectionName = `accounts_${societyName}`;

  useEffect(() => {
    const fetchLedgerGroups = async () => {
      setLoading(true);
      try {
        const ledgerGroupsSnapshot = await getDocs(
          collection(db, "Societies", societyName, ledgerGroupsCollectionName)
        );
        const groupPromises = ledgerGroupsSnapshot.docs.map(
          async (groupDoc) => {
            const groupId = groupDoc.id;
            const accountsSnapshot = await getDocs(
              collection(
                db,
                "Societies",
                societyName,
                ledgerGroupsCollectionName,
                groupId,
                accountsCollectionName
              )
            );

            const accountPromises = accountsSnapshot.docs.map(
              async (accountDoc) => {
                const accountId = accountDoc.id;
                const dateString = selectedDate.toISOString().split("T")[0];
                const balance = await fetchBalanceForDate(
                  societyName,
                  groupId,
                  accountId,
                  dateString
                );
                return { account: accountId, amount: balance };
              }
            );

            const accounts = await Promise.all(accountPromises);
            return { title: groupId, data: accounts };
          }
        );

        const sections = await Promise.all(groupPromises);
        setSectionedAccounts(
          sections.filter((section) => section.data.length > 0)
        );
        setExpandedSections(
          sections.reduce(
            (acc, section) => ({ ...acc, [section.title]: true }),
            {}
          )
        );
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
      <View style={globalStyles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      {/* Top Appbar */}
      <Appbar.Header style={globalStyles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content
          title="Ledger Accounts"
          titleStyle={globalStyles.titleStyle}
        />
      </Appbar.Header>
      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <Text style={globalStyles.datelabel}>As on Date</Text>
      </View>

      <View style={globalStyles.headerview}>
        <View style={globalStyles.datesection}>
          <PaymentDatePicker
            initialDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </View>
        <Button
          mode="contained"
          style={globalStyles.goButton}
          onPress={() => setSelectedDate(new Date(selectedDate))}
        >
          Go
        </Button>
      </View>

      <SectionList
        sections={sectionedAccounts}
        keyExtractor={(item, index) => index.toString()}
        renderSectionHeader={({ section: { title } }) => (
          <TouchableOpacity
            onPress={() => toggleSection(title)}
            style={globalStyles.sectionHeader}
          >
            <Text style={globalStyles.sectionTitle}>{title}</Text>
          </TouchableOpacity>
        )}
        renderItem={({ item, section }) =>
          expandedSections[section.title] ? (
            <View style={globalStyles.inlineItem}>
              <Text
                style={globalStyles.accountName}
              >{`   ${item.account}`}</Text>
              <Text style={globalStyles.accountAmount}>
                ₹ {item.amount.toFixed(2)}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text style={globalStyles.emptyText}>No accounts to display</Text>
        }
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100, // 👈 add enough gap for footer + FAB
        }}
      />

      <View style={[globalStyles.footer, { bottom: insets.bottom }]}>
        <FAB
          style={globalStyles.fab}
          icon="plus"
          onPress={() =>
            router.push("/admin/Accounting/AddLedgerAccountScreen")
          }
          color="white" // Set the icon color to white
        />
      </View>
    </View>
  );
};

export default LedgerAccountsScreen;
