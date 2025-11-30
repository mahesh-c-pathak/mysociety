import React from "react";
import { StyleSheet, StatusBar } from "react-native";
import { Appbar } from "react-native-paper";
import { useRouter, Href } from "expo-router";

interface AppbarComponentProps {
  title: string;
  source?: string;
  onPressFilter?: () => void;
  onPressThreeDot?: () => void;
  onPressSearch?: () => void; // 👈 NEW PROP
  backRoute?: Href; // 👈 NEW PROP
}

const AppbarComponent: React.FC<AppbarComponentProps> = ({
  title,
  source,
  onPressFilter,
  onPressThreeDot,
  onPressSearch, // 👈 destructure it
  backRoute, // 👈 destructure it
}) => {
  const router = useRouter();
  const backgroundColor =
    source === "Admin"
      ? "#6200ee"
      : source === "GateKeeper"
        ? "#353839"
        : source === "Login"
          ? "#00AEEF"
          : "#2196F3"; // default for others

  return (
    <>
      {/* ✅ Set StatusBar color & text style */}
      <StatusBar
        // translucent={false}
        backgroundColor={backgroundColor}
        barStyle="light-content"
        // animated={true}
      />

      <Appbar.Header style={[styles.header, { backgroundColor }]}>
        {/* 👇 Use backRoute if provided, else default to router.back() */}
        <Appbar.BackAction
          onPress={() => {
            if (backRoute) router.replace(backRoute);
            else router.back();
          }}
          color="#fff"
        />
        {/* 👇 Title */}
        <Appbar.Content title={title} titleStyle={styles.titleStyle} />

        {/* 👇 Optional Buttons */}
        {onPressSearch && (
          <Appbar.Action icon="magnify" onPress={onPressSearch} color="#fff" />
        )}

        {onPressFilter && (
          <Appbar.Action icon="filter" onPress={onPressFilter} color="#fff" />
        )}

        {onPressThreeDot && (
          <Appbar.Action
            icon="dots-vertical"
            onPress={onPressThreeDot}
            color="#fff"
          />
        )}
      </Appbar.Header>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#6200ee", // Default color if none is provided
  },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
});

export default AppbarComponent;
