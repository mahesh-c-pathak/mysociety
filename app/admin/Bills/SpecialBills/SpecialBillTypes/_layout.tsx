import React from "react";
import {
  MaterialTopTabNavigationEventMap,
  MaterialTopTabNavigationOptions,
  createMaterialTopTabNavigator,
} from "@react-navigation/material-top-tabs";
import { withLayoutContext } from "expo-router";
import { ParamListBase, TabNavigationState } from "@react-navigation/native";
import AppbarComponent from '../../../../../components/AppbarComponent'; // Adjust the path as per your structure

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
      {/* Appbar Component */}
      <AppbarComponent
        title="Bill Types"
        source="Admin"
      />

      {/* Material Top Tabs */}
      <MaterialTopTabs>
        <MaterialTopTabs.Screen name="create-bill" options={{ title: "Create Bill" }} />
        <MaterialTopTabs.Screen name="draft" options={{ title: "Draft" }} />
      </MaterialTopTabs>
    </>
  );
}
