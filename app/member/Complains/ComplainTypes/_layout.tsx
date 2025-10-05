import React from "react";
import {
  MaterialTopTabNavigationEventMap,
  MaterialTopTabNavigationOptions,
  createMaterialTopTabNavigator,
} from "@react-navigation/material-top-tabs";
import { withLayoutContext, useRouter } from "expo-router";
import { ParamListBase, TabNavigationState } from "@react-navigation/native";
import { Divider } from "react-native-paper";
import AppHeader from "@/components/AppHeader"; // Updated import
const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

export default function TabLayout() {
  const router = useRouter();
  return (
    <>
      {/* AppHeader */}
      <AppHeader
        title="Complains"
        source="Member"
        onBackPress={() => router.back()}
      />

      {/* Divider from React Native Paper */}
      <Divider style={{ backgroundColor: "#ccc" }} />

      {/* Material Top Tabs */}
      <MaterialTopTabs
        screenOptions={{
          tabBarStyle: { backgroundColor: "#2196F3" }, // Common background color for all tabs
          tabBarLabelStyle: { color: "#FFFFFF" }, // Common text color for all tabs
          tabBarIndicatorStyle: { backgroundColor: "#FFFFFF", height: 3 }, // White slider with 3px height
        }}
      >
        <MaterialTopTabs.Screen
          name="OpenComplains"
          options={{
            title: "Open/InProgress",
          }}
        />
        <MaterialTopTabs.Screen
          name="ClosedComplains"
          options={{ title: "Closed" }}
        />
      </MaterialTopTabs>
    </>
  );
}
