import React from "react";
import { Slot } from "expo-router";
import { Appbar } from "react-native-paper";
import { useRouter } from "expo-router";
import { Stack } from "expo-router";

export default function Layout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#6200ee" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerShown: false,
      }}
    />
  );
}
