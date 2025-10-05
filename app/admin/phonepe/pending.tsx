import React from "react";
import { View, Text } from "react-native";

export default function Pending() {
  return (
    <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
      <Text style={{ fontSize: 24, color: "orange" }}>Payment Pending!</Text>
    </View>
  );
}
