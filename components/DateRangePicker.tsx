import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import PaymentDatePicker from "@/utils/paymentDate";

interface DateRangePickerProps {
  fromDate: Date;
  toDate: Date;
  setFromDate: (date: Date) => void;
  setToDate: (date: Date) => void;
  onGoPress: () => void;
  minimumDate?: Date; // Added optional minimumDate
  maximumDate?: Date; // ✅ added optional maximumDate
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  fromDate,
  toDate,
  setFromDate,
  setToDate,
  onGoPress,
  minimumDate, // Optional prop
  maximumDate, // ✅ added Optional prop
}) => {
  return (
    <View style={styles.dateInputsContainer}>
      <View style={styles.section}>
        <PaymentDatePicker
          initialDate={fromDate}
          onDateChange={setFromDate}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      </View>

      <View style={styles.section}>
        <PaymentDatePicker
          initialDate={toDate}
          onDateChange={setToDate}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      </View>

      <TouchableOpacity style={styles.goButton} onPress={onGoPress}>
        <Text style={styles.goButtonText}>Go</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  dateInputsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  section: {
    flex: 1,
    margin: 5,
  },
  goButton: {
    backgroundColor: "green",
    justifyContent: "center",
    alignItems: "center",
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
});

export default DateRangePicker;
