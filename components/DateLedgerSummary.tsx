import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, Button } from "react-native-paper";
import PaymentDatePicker from "@/utils/paymentDate";
import Dropdown from "@/utils/DropDown";
import { fetchAccountList } from "@/utils/acountFetcher";
import { transactionFromToGroupList } from "@/components/LedgerGroupList";
import { formatDateIntl } from "@/utils/dateFormatter";

interface DateLedgerSummaryProps {
  fromDate: Date;
  toDate: Date;
  ledger: string;
  onFromDateChange: (date: Date) => void;
  onToDateChange: (date: Date) => void;
  onLedgerChange: (ledger: string) => void;
  societyName: string;
  showModal: () => void;
  hideModal: () => void;
  isModalVisible: boolean;
  ledgerOptionsOverride?: { label: string; value: string }[]; // ✅ new prop
}

const DateLedgerSummary: React.FC<DateLedgerSummaryProps> = ({
  fromDate,
  toDate,
  ledger,
  onFromDateChange,
  onToDateChange,
  onLedgerChange,
  societyName,
  showModal,
  hideModal,
  isModalVisible,
  ledgerOptionsOverride,
}) => {
  const [ledgerOptions, setLedgerOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const [tempFromDate, setTempFromDate] = useState(fromDate);
  const [tempToDate, setTempToDate] = useState(toDate);

  useEffect(() => {
    if (ledgerOptionsOverride) {
      // Use options passed from parent
      setLedgerOptions(ledgerOptionsOverride);
    } else {
      // Default behavior: fetch ledger options
      const fetchOptions = async () => {
        try {
          const { accountOptions } = await fetchAccountList(
            societyName,
            transactionFromToGroupList
          );
          accountOptions.unshift({ label: "All", value: "All", group: "All" });
          setLedgerOptions(accountOptions);
        } catch (error) {
          console.log("Error fetching ledger options:", error);
        }
      };
      fetchOptions();
    }
  }, [societyName, ledgerOptionsOverride]);

  return (
    <>
      <TouchableOpacity onPress={showModal} activeOpacity={0.8}>
        <View style={styles.summaryContainer}>
          <Text style={styles.text}>
            From: {formatDateIntl(fromDate)} To: {formatDateIntl(toDate)}
          </Text>
          <Text style={styles.text}>Ledger Account: {ledger}</Text>
        </View>
      </TouchableOpacity>

      {isModalVisible && (
        <View style={styles.overlay}>
          <View style={styles.filterBox}>
            <Text style={styles.label}>From Date</Text>
            <PaymentDatePicker
              initialDate={fromDate}
              onDateChange={(date) => setTempFromDate(date)}
            />

            <Text style={styles.label}>To Date</Text>
            <PaymentDatePicker
              initialDate={toDate}
              onDateChange={(date) => setTempToDate(date)}
            />

            <Text style={styles.label}>Select Ledger</Text>
            <Dropdown
              data={ledgerOptions}
              onChange={onLedgerChange}
              placeholder="Select Ledger"
              initialValue={ledger}
            />

            <Button
              mode="contained"
              style={styles.applyButton}
              onPress={() => {
                onFromDateChange(tempFromDate);
                onToDateChange(tempToDate);
                hideModal();
              }}
            >
              Go
            </Button>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  summaryContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  text: { fontSize: 14, color: "#444", marginBottom: 2 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  filterBox: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  label: { fontSize: 13, color: "#444", marginBottom: 8, marginTop: 12 },
  applyButton: { marginTop: 20 },
});

export default DateLedgerSummary;
