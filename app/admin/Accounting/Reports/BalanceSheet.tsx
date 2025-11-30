import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  useWindowDimensions,
  Text,
  Alert,
  TouchableWithoutFeedback,
} from "react-native";
import { ActivityIndicator, Divider } from "react-native-paper";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";
import PaymentDatePicker from "@/utils/paymentDate";
import {
  getCurrentFinancialYear,
  calculateFinancialYears,
} from "@/utils/financialYearHelpers";

import { formatDateIntl, formatDate } from "../../../../utils/dateFormatter";
import { fetchBalanceForDate } from "../../../../utils/fetchbalancefromdatabase";

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import AppbarComponent from "@/components/AppbarComponent";
import AppbarMenuComponent from "@/components/AppbarMenuComponent";

interface Account {
  account: string;
  balance: number;
}
interface FinancialYear {
  label: string;
  start: string;
  end: string;
}

const BalanceSheetNew: React.FC = () => {
  const { societyName } = useSociety();
  const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`;
  const accountsCollectionName = `accounts_${societyName}`;

  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const { width } = useWindowDimensions();
  const [fromDate, setFromDate] = useState(new Date(Date.now()));
  const [toDate, setToDate] = useState(new Date(Date.now()));

  const [openingBankBalance, setOpeningBankBalance] = useState<number>(0);
  const [closingBankBalance, setClosingBankBalance] = useState<number>(0);

  const [openingCashBalance, setOpeningCashBalance] = useState<number>(0);
  const [closingCashBalance, setClosingCashBalance] = useState<number>(0);

  const [sectionedAccounts, setSectionedAccounts] = useState<
    { title: string; data: { group: string; accounts: Account[] }[] }[]
  >([]);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<{ liabilities: number; assets: number }>(
    {
      liabilities: 0,
      assets: 0,
    }
  );

  const handleYearSelect = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    setFromDate(startDate);
    setToDate(endDate);
  };

  useEffect(() => {
    // Set initial state for current financial year
    const { startDate, endDate } = getCurrentFinancialYear();
    setFromDate(new Date(startDate));
    setToDate(new Date(endDate));

    // Fetch balances for the initial date range
    const initializeBalances = async () => {
      await fetchbalances(new Date(startDate), new Date(endDate));
    };
    initializeBalances();

    // Calculate previous 4 financial years
    const today = new Date();
    const currentYear =
      today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear();
    const years = calculateFinancialYears(currentYear, 4); // Get previous 4 financial years
    setFinancialYears(years);
  }, []);

  const buttonWidth = (width - 50) / 4; // Calculate width for 4 buttons with padding

  const liabilityCategories = [
    "Account Payable",
    "Capital Account",
    "Current Liabilities",
    "Deposit",
    "Loan and Advances",
    "Provision",
    "Reserve and Surplus",
    "Share Capital",
    "Sundry Creditors",
    "Suspense Account",
    "Income & Expenditure Account",
  ];

  const assetCategories = [
    "Account Receivable",
    "Bank Accounts",
    "Cash in Hand",
    "Current Assets",
    "Fixed Assets",
    "Investment",
    "Sundry Debtors",
  ];

  const IncomeCategories = ["Direct Income", "Indirect Income"];

  const ExpenditureCategories = [
    "Direct Expenses",
    "Indirect Expenses",
    "Maintenance & Repairing",
  ];

  const fetchLedgerGroupsNew = async () => {
    setLoading(true);
    try {
      const ledgerGroupsRef = collection(
        db,
        "Societies",
        societyName,
        ledgerGroupsCollectionName
      ); // Updated collection name
      const ledgerGroupsSnapshot = await getDocs(ledgerGroupsRef);

      const ledgerGroupsPromises = ledgerGroupsSnapshot.docs.map(
        async (ledgerGroupDoc) => {
          const ledgerGroupName = ledgerGroupDoc.id;
          const accountsRef = collection(
            db,
            `Societies/${societyName}/${ledgerGroupsCollectionName}/${ledgerGroupDoc.id}/${accountsCollectionName}`
          ); // Updated collection path
          const accountsSnapshot = await getDocs(accountsRef);

          const accountsPromises = accountsSnapshot.docs.map(
            async (accountDoc) => {
              const accountName = accountDoc.id;

              const latestBalance = await fetchBalanceForDate(
                societyName,
                ledgerGroupName,
                accountName,
                toDate.toISOString() // Ensure the date is in ISO format
              );

              return {
                account: accountName,
                balance: latestBalance,
              };
            }
          );

          const accounts = await Promise.all(accountsPromises);

          return {
            name: ledgerGroupName,
            accounts,
          };
        }
      );

      const ledgerGroups = await Promise.all(ledgerGroupsPromises);

      const liabilities = ledgerGroups
        .filter((group) => liabilityCategories.includes(group.name))
        .map((group) => ({
          group: group.name,
          accounts: group.accounts.filter(
            (account) => account.account.trim() !== ""
          ),
        }))
        .filter((group) => group.accounts.length > 0);

      const assets = ledgerGroups
        .filter((group) => assetCategories.includes(group.name))
        .map((group) => ({
          group: group.name,
          accounts: group.accounts.filter(
            (account) => account.account.trim() !== ""
          ),
        }))
        .filter((group) => group.accounts.length > 0);

      let incomeTotal = 0;
      let expenditureTotal = 0;

      ledgerGroups.forEach((group) => {
        if (IncomeCategories.includes(group.name)) {
          incomeTotal += group.accounts.reduce(
            (sum, account) => sum + (account.balance || 0),
            0
          );
        } else if (ExpenditureCategories.includes(group.name)) {
          expenditureTotal += group.accounts.reduce(
            (sum, account) => sum + (account.balance || 0),
            0
          );
        }
      });

      const incomeExpenditureSurplus = incomeTotal - expenditureTotal;

      // Using + instead of - to reflect total combined effect of income and expense reductions
      // const incomeExpenditureSurplus = incomeTotal + expenditureTotal;

      liabilities.push({
        group: "Income & Expenditure Account",
        accounts: [
          {
            account: "Surplus Amount",
            balance: incomeExpenditureSurplus,
          },
        ],
      });

      const totalLiabilities = liabilities.reduce(
        (sum, group) =>
          sum +
          group.accounts.reduce(
            (acc, account) => acc + (account.balance || 0),
            0
          ),
        0
      );

      const totalAssets = assets.reduce(
        (sum, group) =>
          sum +
          group.accounts.reduce(
            (acc, account) => acc + (account.balance || 0),
            0
          ),
        0
      );

      setTotals({ liabilities: totalLiabilities, assets: totalAssets });

      const sections = [
        { title: "Liabilities", data: liabilities },
        { title: "Assets", data: assets },
      ];

      setSectionedAccounts(sections);
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

  useEffect(() => {
    fetchLedgerGroupsNew();
  }, []);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const fetchbalances = async (start: Date, end: Date) => {
    const formattedStartDate = formatDate(start);
    const formattedEndDate = formatDate(end);

    const balanceBank = await fetchBalanceForDate(
      societyName,
      "Bank Accounts",
      "Bank",
      formattedStartDate
    );
    setOpeningBankBalance(balanceBank);

    const balanceCash = await fetchBalanceForDate(
      societyName,
      "Cash in Hand",
      "Cash",
      formattedStartDate
    );
    setOpeningCashBalance(balanceCash);

    const balanceBankForDate = await fetchBalanceForDate(
      societyName,
      "Bank Accounts",
      "Bank",
      formattedEndDate
    );
    setClosingBankBalance(balanceBankForDate);

    const balanceCloseForDate = await fetchBalanceForDate(
      societyName,
      "Cash in Hand",
      "Cash",
      formattedEndDate
    );
    setClosingCashBalance(balanceCloseForDate);
  };

  const [menuVisible, setMenuVisible] = useState(false);
  const handleMenuOptionPress = (option: string) => {
    console.log(`${option} selected`);
    if (option === "Download PDF") {
      generatePDF();
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

  const generatePDF = async () => {
    try {
      const htmlContent = `
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            h1 {
              text-align: center;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f4f4f4;
            }
            .subgroup {
              padding-left: 20px;
              font-style: italic;
            }
            .account {
              padding-left: 40px;
            }
            .summary {
              margin-top: 20px;
            }
            .total {
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h1>Balance Sheet</h1>
          <p>Period: ${formatDateIntl(fromDate)} to ${formatDateIntl(
            toDate
          )}</p>

          <h2>Liabilities</h2>
          <table>
            <thead>
              <tr>
                <th>Group</th>
                <th>Subgroup/Account</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${sectionedAccounts
                .find((section) => section.title === "Liabilities")
                ?.data.map(
                  (group) => `
                  <tr>
                    <td>${group.group}</td>
                    <td colspan="2"></td>
                  </tr>
                  ${group.accounts
                    .map(
                      (account) => `
                    <tr>
                      <td></td>
                      <td class="subgroup">${account.account}</td>
                      <td>₹${account.balance.toFixed(2)}</td>
                    </tr>
                  `
                    )
                    .join("")}
                `
                )
                .join("")}
            </tbody>
          </table>
          <p class="total">Total Liabilities: ₹${totals.liabilities.toFixed(
            2
          )}</p>

          <h2>Assets</h2>
          <table>
            <thead>
              <tr>
                <th>Group</th>
                <th>Subgroup/Account</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${sectionedAccounts
                .find((section) => section.title === "Assets")
                ?.data.map(
                  (group) => `
                  <tr>
                    <td>${group.group}</td>
                    <td colspan="2"></td>
                  </tr>
                  ${group.accounts
                    .map(
                      (account) => `
                    <tr>
                      <td></td>
                      <td class="subgroup">${account.account}</td>
                      <td>₹${account.balance.toFixed(2)}</td>
                    </tr>
                  `
                    )
                    .join("")}
                `
                )
                .join("")}
            </tbody>
          </table>
          <p class="total">Total Assets: ₹${totals.assets.toFixed(2)}</p>

          <h2>Bank and Cash Summary</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Opening Balance</th>
                <th>Closing Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Bank</td>
                <td>₹${openingBankBalance.toFixed(2)}</td>
                <td>₹${closingBankBalance.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Cash</td>
                <td>₹${openingCashBalance.toFixed(2)}</td>
                <td>₹${closingCashBalance.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Error", "Sharing is not available on this device.");
      }

      // Open print preview or share
      // await Print.printAsync({ uri });
    } catch (error) {
      Alert.alert("Error", "Failed to generate PDF");
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={closeMenu}>
        <View style={{ flexGrow: 0 }}>
          {/* Top Appbar */}
          <AppbarComponent
            title="BalanceSheet"
            source="Admin"
            onPressThreeDot={() => setMenuVisible(!menuVisible)}
          />

          {/* Three-dot Menu */}
          {/* Custom Menu */}
          {menuVisible && (
            <AppbarMenuComponent
              items={["Download PDF"]}
              onItemPress={handleMenuOptionPress}
              closeMenu={closeMenu}
            />
          )}

          {/* Financial Year Buttons */}
          <View style={styles.fyContainer}>
            {financialYears.map((year) => (
              <TouchableOpacity
                key={year.label}
                style={[styles.fyButton, { width: buttonWidth }]}
                onPress={() => handleYearSelect(year.start, year.end)}
              >
                <Text style={styles.fyText}>{year.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Inputs */}
          <View style={styles.dateInputsContainer}>
            <View style={styles.section}>
              <PaymentDatePicker
                initialDate={fromDate}
                onDateChange={setFromDate}
              />
            </View>
            <View style={styles.section}>
              <PaymentDatePicker
                initialDate={toDate}
                onDateChange={setToDate}
              />
            </View>

            <TouchableOpacity
              style={styles.goButton}
              onPress={() => {
                fetchbalances(fromDate, toDate); // Fetch balances based on current dates
                fetchLedgerGroupsNew(); // Fetch ledger groups
              }}
            >
              <Text style={styles.goButtonText}>Go</Text>
            </TouchableOpacity>
          </View>

          <Divider />

          {/* Bank and Cash Balances */}
          <View style={styles.balancesContainer}>
            <View style={[styles.balanceCard, styles.bankCard]}>
              <Text style={styles.balanceTitle}>Bank</Text>
              <Text style={styles.balanceText}>
                Opening Bal:
                <Text style={styles.balanceTextAmt}>
                  {" "}
                  ₹ {openingBankBalance.toFixed(2)}
                </Text>
              </Text>
              <Text style={styles.balanceText}>
                Closing Bal:
                <Text style={styles.balanceTextAmt}>
                  ₹ {closingBankBalance.toFixed(2)}
                </Text>
              </Text>
            </View>
            <View style={[styles.balanceCard, styles.cashCard]}>
              <Text style={styles.balanceTitle}>Cash</Text>
              <Text style={styles.balanceText}>
                Opening Bal:
                <Text style={styles.balanceTextAmt}>
                  {" "}
                  ₹ {openingCashBalance.toFixed(2)}
                </Text>
              </Text>
              <Text style={styles.balanceText}>
                Closing Bal:
                <Text style={styles.balanceTextAmt}>
                  ₹ {closingCashBalance.toFixed(2)}
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>

      <SectionList
        sections={sectionedAccounts}
        style={{ flex: 1 }}
        keyExtractor={(item, index) => index.toString()}
        renderSectionHeader={({ section: { title } }) => (
          <TouchableOpacity
            onPress={() => toggleSection(title)}
            style={styles.sectionHeader}
          >
            <Text style={styles.sectionTitle}>{title}</Text>
          </TouchableOpacity>
        )}
        renderItem={({ item, section }) =>
          expandedSections[section.title] ? (
            <View>
              <Text style={styles.groupTitle}>
                {item.group || "Unknown Group"}
              </Text>
              {item.accounts.map((account, idx) => (
                <View key={idx} style={styles.accountRow}>
                  <Text
                    style={styles.accountName}
                  >{`   ${account.account}`}</Text>
                  <Text style={styles.accountBalance}>
                    ₹ {account.balance.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null
        }
        renderSectionFooter={({ section: { title } }) => {
          const total =
            title === "Liabilities" ? totals.liabilities : totals.assets;
          return (
            <View style={styles.footerRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₹ {total.toFixed(2)}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No accounts to display</Text>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  groupTitle: {
    fontSize: 16,
    marginVertical: 8,
    marginLeft: 16,
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  accountName: {
    fontSize: 14,
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 16,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "bold",
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },

  fyContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  fyButton: {
    backgroundColor: "#dddddd",
    borderRadius: 5,
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 5,
    elevation: 2,
    marginTop: 10,
  },
  fyText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
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
  balancesContainer: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  balanceCard: {
    flex: 1,
    padding: 8,
    borderRadius: 5,
    marginHorizontal: 5,
    elevation: 2,
  },
  bankCard: {
    backgroundColor: "#d6eaff",
  },
  cashCard: {
    backgroundColor: "#d1f7d6",
  },
  balanceTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  balanceText: {
    fontSize: 12,
    marginBottom: 5,
  },
  balanceTextAmt: {
    fontSize: 14,
    fontWeight: "bold",
  },
  section: { flex: 1, margin: 5 },
});

export default BalanceSheetNew;
