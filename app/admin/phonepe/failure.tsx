import React from "react";
import { View, Text } from "react-native";

export default function Failure() {
  return (
    <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
      <Text style={{ fontSize: 24, color: "red" }}>Payment Failed!</Text>
    </View>
  );
}
