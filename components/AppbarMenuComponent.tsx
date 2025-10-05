import React from "react";
import { View, Text, Pressable, StyleSheet, TouchableWithoutFeedback } from "react-native";

interface MenuComponentProps {
  items: string[];
  onItemPress: (item: string) => void;
  closeMenu: () => void;
}

const AppbarMenuComponent: React.FC<MenuComponentProps> = ({ items, onItemPress, closeMenu }) => {
  return (
    <TouchableWithoutFeedback onPress={closeMenu}>
      <View style={styles.menu}>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                onItemPress(item);
                closeMenu(); // Close the menu after pressing an item
              }}
            >
              <Text>{item}</Text>
            </Pressable>
            {index < items.length - 1 && <View style={styles.menuDivider} />}
          </React.Fragment>
        ))}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    top: 50,
    right: 10,
    backgroundColor: "white",
    borderRadius: 8,
    elevation: 5,
    padding: 10,
    zIndex: 1,
  },
  menuItem: {
    padding: 10,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: 5,
  },
});

export default AppbarMenuComponent;
