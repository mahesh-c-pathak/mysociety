import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { calculateFinancialYears } from "@/utils/financialYearHelpers";

// Keep the interface for type safety
interface FinancialYear {
  label: string;
  start: string;
  end: string;
}

interface FinancialYearButtonsProps {
  onYearSelect: (start: string, end: string) => void;
  totalYears?: number; // how many years to show, default 4
}

const FinancialYearButtons: React.FC<FinancialYearButtonsProps> = ({
  onYearSelect,
  totalYears = 4,
}) => {
  const { width } = useWindowDimensions();
  const buttonWidth = (width - 50) / 4;

  // Generate current + previous financial years with type
  const today = new Date();
  const currentYear =
    today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear();
  const financialYears: FinancialYear[] = calculateFinancialYears(
    currentYear,
    totalYears
  );

  return (
    <View style={styles.container}>
      {financialYears.map((year) => (
        <TouchableOpacity
          key={year.label}
          style={[styles.button, { width: buttonWidth }]}
          onPress={() => onYearSelect(year.start, year.end)}
        >
          <Text style={styles.text}>{year.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  button: {
    backgroundColor: "#dddddd",
    borderRadius: 5,
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 5,
    elevation: 2,
    marginTop: 10,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
});

export default FinancialYearButtons;
