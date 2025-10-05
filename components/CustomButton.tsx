import React from "react";
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";

type SaveButtonProps = {
  onPress: () => void;
  title?: string | React.ReactNode; // ✅ allow string or JSX
  style?: ViewStyle; // Allow overriding styles
};

const CustomButton: React.FC<SaveButtonProps> = ({
  onPress,
  title = "Save",
  style,
}) => {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: "absolute", // Ensure it's always at the bottom
    bottom: 0, // Default positioning
    left: 10,
    right: 10,
    backgroundColor: "#6200ee", // Purple color similar to the image
    borderRadius: 5,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff", // White text
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CustomButton;
