import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  TextInput,
} from "react-native";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";

interface OptionItem {
  label: string;
  value: string;
}

interface DropdownMultiSelectProps {
  options: OptionItem[];
  selectedValues: string[]; // controlled from parent
  onChange: (values: string[]) => void;
  placeholder?: string;
}

const DropdownMultiSelect: React.FC<DropdownMultiSelectProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = "Select...",
}) => {
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    return options.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  const allSelected =
    options.length > 0 && selectedValues.length === options.length;

  // Handle Select All / Deselect All
  const handleSelectAll = () => {
    if (allSelected) {
      onChange([]); // Deselect all
    } else {
      onChange(options.map((o) => o.value)); // Select all
    }
  };

  // toggle item selection
  const onSelect = useCallback(
    (item: OptionItem) => {
      let updatedValues;
      if (selectedValues.includes(item.value)) {
        updatedValues = selectedValues.filter((v) => v !== item.value);
      } else {
        updatedValues = [...selectedValues, item.value];
      }
      onChange(updatedValues);
    },
    [selectedValues, onChange]
  );

  return (
    <View>
      {/* Dropdown opener */}
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setDropdownVisible(true)}
      >
        <Text style={styles.buttonText}>
          {selectedValues.length > 0
            ? `${selectedValues.length} selected`
            : placeholder}
        </Text>
      </TouchableOpacity>

      {/* Modal dropdown */}
      <Modal
        transparent={true}
        visible={isDropdownVisible}
        animationType="slide"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Search Bar */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search members..."
              placeholderTextColor="#777"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {/* ✅ Select All Option */}
            <TouchableOpacity
              style={[styles.option, allSelected && styles.selectedOption]}
              onPress={handleSelectAll}
            >
              <Text
                style={[
                  styles.optionText,
                  allSelected && styles.selectedOptionText,
                ]}
              >
                {allSelected ? "Deselect All" : "Select All"}
              </Text>
              {allSelected && (
                <AntDesign name="check" size={16} color="white" />
              )}
            </TouchableOpacity>

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    selectedValues.includes(item.value) &&
                      styles.selectedOption,
                  ]}
                  onPress={() => onSelect(item)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedValues.includes(item.value) &&
                        styles.selectedOptionText,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {selectedValues.includes(item.value) && (
                    <AntDesign name="check" size={16} color="white" />
                  )}
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDropdownVisible(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Chips for selected values */}
      {selectedValues.length > 0 && (
        <View style={styles.selectedContainer}>
          {selectedValues.map((value) => {
            const selectedOption = options.find((o) => o.value === value);
            return (
              <View key={value} style={styles.chip}>
                <Text style={styles.chipText}>{selectedOption?.label}</Text>
                <TouchableOpacity
                  onPress={() =>
                    onChange(selectedValues.filter((v) => v !== value))
                  }
                >
                  <MaterialIcons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dropdownButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
  },
  buttonText: {
    fontSize: 14,
    color: "#333",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 10,
    padding: 16,
    maxHeight: "70%",
  },
  option: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionText: {
    fontSize: 14,
    color: "#333",
  },
  selectedOption: {
    backgroundColor: "#6200ee",
  },
  selectedOptionText: {
    color: "white",
    fontWeight: "bold",
  },
  closeButton: {
    padding: 12,
    backgroundColor: "#6200ee",
    borderRadius: 6,
    marginTop: 12,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  selectedContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6200ee",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: "#fff",
    marginRight: 6,
    fontSize: 13,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    fontSize: 14,
    color: "#333",
  },
});

export default DropdownMultiSelect;
