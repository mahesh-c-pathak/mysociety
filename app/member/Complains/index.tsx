import { View, Text, StyleSheet } from "react-native";
import React, { useState, useEffect } from "react";
import { Appbar } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";

const index = () => {
  const router = useRouter();
  return (
    <View style={styles.container}>
      {/* Appbar */}

      <Text>index</Text>
    </View>
  );
};

export default index;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { backgroundColor: "#2196F3" },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
});
