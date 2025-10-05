import { StyleSheet, Text, View } from 'react-native'
import {  Appbar } from "react-native-paper";
import { useRouter } from "expo-router";
import React from 'react'

const CashBook = () => {
    const router = useRouter();
    const resetFilters = () => {
        console.log("Reset filter pressed")
      };

  return (
    <View style={styles.container}>
        {/* Appbar Header */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content title="Cash Book" titleStyle={styles.titleStyle} />
        <Appbar.Action 
        icon="filter" 
        onPress={() => resetFilters()}
        color="#fff"
        />
        <Appbar.Action icon="dots-vertical" onPress={() => {}} color="#fff" />
      </Appbar.Header>
      <Text>CashBook</Text>
    </View>
  )
}

export default CashBook

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
      },
      header: { backgroundColor: "#6200ee" },
      titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
})