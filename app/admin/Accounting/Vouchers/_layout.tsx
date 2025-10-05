
import React from "react";
import { Stack } from "expo-router";

export default function Layout() {
  

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#6200ee" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerShown:false
        
      }}
    />
  );
}