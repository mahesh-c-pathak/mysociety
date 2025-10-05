// app/building-maintenance.tsx
import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Appbar} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";

const JoinApp = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  // Dynamically calculate spacing
  const spacing = height * 0.1; // 5% of screen height
  useEffect(() => {
      // Dynamically hide the header for this screen
      navigation.setOptions({ headerShown: false });
    }, [navigation]);

  return (
    <View style={styles.container}>
        {/* Top Appbar */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content
            title="Join App"
            titleStyle={styles.titleStyle}
        />
      </Appbar.Header>
      
      <View style={[styles.card, {marginTop:spacing, marginBottom: spacing }]}>
        <Text style={styles.description}>
          Obtain your joining code from the building administrator. Click Join
          Building, select your block, and effortlessly connect with your
          neighbors. Enhance your community experience today.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/setupsociety/joinbuilding')}
          
        >
          <Text style={styles.buttonText}>Join your Building</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { marginBottom: spacing }]}>
        <Text style={styles.description}>
          If your building isn’t listed, take the initiative to create a new
          one. Shape a vibrant community and explore our smart building
          maintenance feature for seamless living. Join the journey toward
          modern living today.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/setupsociety/requesttrial')}
        >
          <Text style={styles.buttonText}>Create New Building</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default JoinApp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: "#0288d1", // Match background color from the attached image
    elevation: 4,
  },
  titleStyle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  centerTitle: {
    alignItems: "center", // Center-align title
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  description: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
