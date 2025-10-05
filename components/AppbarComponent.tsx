import React from 'react';
import { StyleSheet } from 'react-native';
import { Appbar } from 'react-native-paper';

interface AppbarComponentProps {
  title: string;
  source?: string;
  onPressFilter?: () => void;
  onPressThreeDot?: () => void;
}

const AppbarComponent: React.FC<AppbarComponentProps> = ({
  title,
  source,
  onPressFilter,
  onPressThreeDot,
}) => {
  const backgroundColor = source === 'Admin' ? '#6200ee' : '#2196F3';

  return (
    <Appbar.Header style={[styles.header, { backgroundColor }]}>
      <Appbar.BackAction onPress={() => console.log('Back pressed')} color="#fff" />
      <Appbar.Content title={title} titleStyle={styles.titleStyle} />
      {onPressFilter && (
        <Appbar.Action icon="filter" onPress={onPressFilter} color="#fff" />
      )}
      {onPressThreeDot && (
        <Appbar.Action icon="dots-vertical" onPress={onPressThreeDot} color="#fff" />
      )}
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#6200ee', // Default color if none is provided
  },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
});

export default AppbarComponent;
