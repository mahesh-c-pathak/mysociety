import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Text } from "react-native-paper";

export interface AccountBalance {
  label: string;
  group: string;
  opening: number;
  closing: number;
}

interface AccountSummaryCardsProps {
  balances: AccountBalance[];
}

const bankColors = ["#B2EBF2", "#FFD580", "#D8BFD8", "#29B6F6"];
const cashColors = ["#B2DFDB", "#FFB6C1", "#FFE5B4", "#26A69A"];

const getCardColor = (label: string, group: string, index: number) => {
  if (label === "Bank") return "#B2EBF2";
  if (label === "Cash") return "#B2DFDB";
  return group === "Bank Accounts"
    ? bankColors[index % bankColors.length]
    : cashColors[index % cashColors.length];
};

const formatIndianCurrency = (amount: number) =>
  amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const AccountSummaryCards: React.FC<AccountSummaryCardsProps> = ({
  balances,
}) => {
  const { width } = useWindowDimensions();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
      snapToInterval={width / 2.2 + 10} // card width + margin
      decelerationRate="fast"
    >
      {balances.map((b, index) => {
        const backgroundColor = getCardColor(b.label, b.group, index);

        return (
          <View
            key={b.label}
            style={[styles.block, { width: width / 2.2, backgroundColor }]}
          >
            <Text style={styles.blockTitle}>{b.label}</Text>
            <Text style={styles.label}>
              Opening Bal: ₹{" "}
              <Text style={styles.value}>
                {formatIndianCurrency(b.opening)}
              </Text>
            </Text>
            <Text style={styles.label}>
              Closing Bal: ₹{" "}
              <Text style={styles.value}>
                {formatIndianCurrency(b.closing)}
              </Text>
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: 8,
    marginVertical: 4,
    alignItems: "center",
  },
  block: {
    padding: 10,
    marginRight: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    height: 90,
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    color: "#444",
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: "#000",
  },
});

export default AccountSummaryCards;
