import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Appbar, Button, IconButton, Card } from "react-native-paper";

export default function AdminHome() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Action
          icon="menu"
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
        <Appbar.Content title="Admin Home" />
        <IconButton icon="bell" onPress={() => {}} />
      </Appbar.Header>
      {/* rest of your screen */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  appBar: {
    backgroundColor: "#5e35b1",
  },
});
