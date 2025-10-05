import React from "react";
import { Modal, View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Action {
  label: string;
  onPress: () => void;
  color?: string; // optional custom color
}

interface ActionModalProps {
  visible: boolean;
  onClose: () => void;
  actions: Action[];
}

export default function ActionModal({
  visible,
  onClose,
  actions,
}: ActionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Cancel (X) Icon in top-right */}
          <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.modalButton,
                { backgroundColor: action.color || "#5C6BC0" },
              ]}
              onPress={action.onPress}
            >
              <Text style={styles.modalButtonText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    paddingTop: 50, // extra space for the close button
  },
  modalButton: {
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  closeIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 10,
    backgroundColor: "red",
    borderRadius: 15,
  },
});
