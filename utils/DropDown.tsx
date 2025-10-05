import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";

type OptionItem = {
  value: string;
  label: string;
};

interface DropDownProps {
  data: OptionItem[];
  onChange: (value: string) => void;
  placeholder: string;
  initialValue?: string;
}

export default function Dropdown({
  data,
  onChange,
  placeholder,
  initialValue = "",
}: DropDownProps) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState(initialValue);

  const toggleExpanded = useCallback(() => setExpanded(!expanded), [expanded]);

  const onSelect = useCallback(
    (item: OptionItem) => {
      onChange(item.value);
      setValue(item.label);
      setExpanded(false);
    },
    [onChange]
  );

  // Synchronize `value` state with `initialValue` prop
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={toggleExpanded}
      >
        <Text style={styles.text}>{value || placeholder}</Text>
        <AntDesign name={expanded ? "caretup" : "caretdown"} />
      </TouchableOpacity>

      {expanded && (
        <Modal
          transparent
          animationType="fade"
          visible={expanded}
          onRequestClose={() => setExpanded(false)}
        >
          <TouchableWithoutFeedback onPress={() => setExpanded(false)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContainer}>
                <FlatList
                  keyExtractor={(item) => item.value}
                  data={data}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.optionItem}
                      activeOpacity={0.8}
                      onPress={() => onSelect(item)}
                    >
                      <Text>{item.label}</Text>
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => (
                    <View style={styles.separator} />
                  )}
                  style={styles.optionList}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  button: {
    height: 50,
    justifyContent: "space-between",
    backgroundColor: "#fff",
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  text: {
    fontSize: 15,
    opacity: 0.8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 8,
    maxHeight: "50%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 10,
  },
  optionItem: {
    padding: 15,
    justifyContent: "center",
  },
  separator: {
    height: 1,
    backgroundColor: "#ccc",
  },
  optionList: {
    maxHeight: 250,
  },
});
