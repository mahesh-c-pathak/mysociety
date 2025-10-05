import React, { useState, useEffect } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

const PaymentDatePicker = ({
  initialDate,
  onDateChange,
  minimumDate, // Optional prop
  placeholder = "YYYY-MM-DD", // 👈 added optional placeholder
}: {
  initialDate?: Date | null; // 👈 allow null
  onDateChange: (date: Date) => void;
  minimumDate?: Date; // Added optional minimumDate
  placeholder?: string;
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    initialDate ?? null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Sync the selectedDate with changes in the initialDate prop
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      setSelectedDate(date);
      onDateChange(date);
    }
    setShowDatePicker(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={styles.dateInputContainer}
      >
        <TextInput
          style={styles.dateInput}
          value={selectedDate ? formatDate(selectedDate) : ""}
          placeholder={placeholder} // 👈 shows "YYYY-MM-DD" when no date
          placeholderTextColor="#999"
          editable={false}
        />
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate ?? new Date()} // ✅ always a Date
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={minimumDate} // Apply minimumDate only if provided
        />
      )}
    </View>
  );
};

export default PaymentDatePicker;

const styles = StyleSheet.create({
  container: { marginBottom: 5 },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
  },
  calendarIcon: { fontSize: 20, marginLeft: 8 },
});
