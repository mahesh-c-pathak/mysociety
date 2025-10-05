import React from "react";
import {
  MaterialTopTabNavigationEventMap,
  MaterialTopTabNavigationOptions,
  createMaterialTopTabNavigator,
} from "@react-navigation/material-top-tabs";
import { withLayoutContext, Stack } from "expo-router";
import { ParamListBase, TabNavigationState } from "@react-navigation/native";
import AppbarComponent from "@/components/AppbarComponent"; // Adjust the path as per your structure
import { Divider } from "react-native-paper";

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

export default function TabLayout() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Appbar Component */}
      <AppbarComponent title="Complains" source="Admin" />

      {/* Divider from React Native Paper */}
      <Divider style={{ backgroundColor: "#ccc" }} />

      {/* Material Top Tabs */}
      <MaterialTopTabs
        screenOptions={{
          tabBarStyle: { backgroundColor: "#6200ee" }, // Common background color for all tabs
          tabBarLabelStyle: { color: "#FFFFFF" }, // Common text color for all tabs
          tabBarIndicatorStyle: { backgroundColor: "#FFFFFF", height: 3 }, // White slider with 3px height
        }}
      >
        <MaterialTopTabs.Screen
          name="OpenComplainsAdmin"
          options={{
            title: "Open/InProgress",
          }}
        />
        <MaterialTopTabs.Screen
          name="ClosedComplainsAdmin"
          options={{ title: "Closed" }}
        />
      </MaterialTopTabs>
    </>
  );
}
