import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, Text } from "react-native-paper";

interface IncomeExpenseSummaryProps {
  totalIncome: number;
  totalExpenses: number;
}

const formatIndianCurrency = (amount: number) =>
  amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const IncomeExpenseSummary: React.FC<IncomeExpenseSummaryProps> = ({
  totalIncome,
  totalExpenses,
}) => {
  return (
    <View style={styles.summary}>
      {/* Income Card */}
      <Card style={[styles.card, styles.incomeCard]}>
        <View style={styles.content}>
          <Text style={styles.title}>Total Income</Text>
          <Text style={styles.incomeText}>
            ₹ {formatIndianCurrency(totalIncome)}
          </Text>
        </View>
      </Card>

      {/* Expense Card */}
      <Card style={[styles.card, styles.expenseCard]}>
        <View style={styles.content}>
          <Text style={styles.title}>Total Expenses</Text>
          <Text style={styles.expenseText}>
            ₹ {formatIndianCurrency(totalExpenses)}
          </Text>
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
    paddingHorizontal: 8,
  },
  card: {
    marginHorizontal: 5,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    backgroundColor: "#fff",
  },
  content: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  title: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  incomeCard: {
    borderColor: "#4CAF50",
    borderWidth: 1,
  },
  expenseCard: {
    borderColor: "#E91E63",
    borderWidth: 1,
  },
  incomeText: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  expenseText: {
    fontSize: 16,
    color: "#E91E63",
    fontWeight: "bold",
  },
});

export default IncomeExpenseSummary;
