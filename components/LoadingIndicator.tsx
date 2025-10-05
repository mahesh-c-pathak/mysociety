// components/LoadingIndicator.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { ActivityIndicator } from "react-native-paper";

interface LoadingIndicatorProps {
  size?: number | "small" | "large";
  color?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = "large",
  color = "#2196F3",
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
};

export default LoadingIndicator;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
