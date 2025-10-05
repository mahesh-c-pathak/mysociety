import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Appbar, Menu } from "react-native-paper";

interface AppHeaderProps {
  title: string;
  source?: "Admin" | "Member" | "Gatekeeper";
  onBackPress?: () => void;
  onPressFilter?: () => void;
  menuItems?: { label: string; onPress: () => void }[];
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  source = "Member",
  onBackPress,
  onPressFilter,
  menuItems = [],
}) => {
  const [menuVisible, setMenuVisible] = useState(false);

  // 🎨 Role-based background colors
  const roleColors: Record<string, string> = {
    Admin: "#6200ee", // Purple
    Member: "#2196F3", // Blue
    Gatekeeper: "#388e3c", // Green
  };

  const backgroundColor = roleColors[source] || "#2196F3";

  return (
    <Appbar.Header style={[styles.header, { backgroundColor }]}>
      {onBackPress && <Appbar.BackAction onPress={onBackPress} color="#fff" />}
      <Appbar.Content title={title} titleStyle={styles.titleStyle} />

      {onPressFilter && (
        <Appbar.Action icon="filter" onPress={onPressFilter} color="#fff" />
      )}

      {/* 3-dot menu using Paper.Menu */}
      {menuItems.length > 0 && (
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="dots-vertical"
              color="#fff"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          {menuItems.map((item, index) => (
            <Menu.Item
              key={index}
              title={item.label}
              onPress={() => {
                item.onPress();
                setMenuVisible(false);
              }}
            />
          ))}
        </Menu>
      )}
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  header: {
    elevation: 4,
  },
  titleStyle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default AppHeader;
