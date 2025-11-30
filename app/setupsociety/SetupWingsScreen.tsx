import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Card, Text } from "react-native-paper";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { MaterialIcons } from "@expo/vector-icons"; // Import icon library
import AppbarComponent from "@/components/AppbarComponent";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SetupWingsScreen: React.FC = () => {
  const { societyName: localName } = useLocalSearchParams() as {
    societyName: string;
  }; // Society name

  const customWingsSubcollectionName = `${localName} wings`;
  const customFloorsSubcollectionName = `${localName} floors`;

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [wings, setWings] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [alreadySetupWings, setAlreadySetupWings] = useState<string[]>([]);
  console.log("alreadySetupWings", alreadySetupWings);

  useFocusEffect(
    useCallback(() => {
      const fetchWingsData = async () => {
        if (!localName) {
          console.error("Error: Society name (localName) is missing.");
          setLoading(false);
          return;
        }

        try {
          const wingsCollectionRef = collection(
            db,
            "Societies",
            localName,
            customWingsSubcollectionName
          );
          const wingsSnapshot = await getDocs(wingsCollectionRef);

          if (!wingsSnapshot.empty) {
            const wingsData: Record<string, any> = {};
            const alreadySetupWings: string[] = []; // To store wings with floors

            // Iterate through each wing and fetch data
            await Promise.all(
              wingsSnapshot.docs.map(async (doc) => {
                const wingKey = doc.id; // Get wing document ID
                wingsData[wingKey] = doc.data(); // Store wing data

                // Construct reference to the floors collection for the current wing
                const floorsCollectionRef = collection(
                  db,
                  "Societies",
                  localName,
                  customWingsSubcollectionName,
                  wingKey,
                  customFloorsSubcollectionName
                );

                // Check if the floors collection exists and has documents
                const floorsSnapshot = await getDocs(floorsCollectionRef);
                if (!floorsSnapshot.empty) {
                  alreadySetupWings.push(wingKey); // Add wing to the setup array
                }
              })
            );

            setWings(wingsData); // Set the wings data state
            setAlreadySetupWings(alreadySetupWings); // Update alreadySetupWings state
          } else {
            setWings(null); // No wings found
          }
        } catch (error) {
          console.error("Error fetching wings data:", error);
          setWings(null);
        } finally {
          setLoading(false);
        }
      };

      fetchWingsData();
    }, [customFloorsSubcollectionName, customWingsSubcollectionName, localName])
  );

  const generateCards = () => {
    if (!wings) return null;

    const cards = Object.keys(wings).map((wingKey) => {
      const wingData = wings[wingKey];
      const wingLetter = wingKey.split("-").pop(); // Extracts the wing identifier (e.g., 'A' from 'Wing-A')
      const isSetup = alreadySetupWings.includes(wingKey); // Check if the wing is in alreadySetupWings

      return (
        <Card
          key={wingKey}
          style={styles.card}
          onPress={() => {
            if (isSetup) {
              // Route to WingSetupScreen if alreadySetupWings includes this wingKey
              router.push({
                pathname: "/setupsociety/WingSetupScreen",
                params: {
                  societyName: localName,
                  Wing: wingLetter,
                },
              });
            } else {
              // Default route for wings not in alreadySetupWings
              router.push({
                pathname: "/setupsociety/[Wing]",
                params: {
                  societyName: localName,
                  Wing: `Wing-${wingLetter}`, // dynamic part
                  totalFloors: wingData.totalFloors,
                  unitsPerFloor: wingData.unitsPerFloor,
                },
              });
            }
          }}
        >
          <Card.Title
            title={`Setup Wing ${wingLetter}`}
            right={() =>
              isSetup ? (
                <MaterialIcons name="check-circle" size={24} color="green" />
              ) : (
                <MaterialIcons name="cancel" size={24} color="red" />
              )
            }
          />
        </Card>
      );
    });

    return cards;
  };

  const allWingsSetUp = React.useMemo(() => {
    return wings && Object.keys(wings).length === alreadySetupWings.length;
  }, [wings, alreadySetupWings]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5e35b1" />
      </View>
    );
  }

  if (!wings) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          No wings data found. Please check your connection or society details.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Appbar */}

      <AppbarComponent title="Setup Wings" source="Admin" />

      <View style={styles.textView}>
        <Text>
          Setup all your blocks and you will be on admin dashboard screen
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {generateCards()}
      </ScrollView>

      {allWingsSetUp && (
        <TouchableOpacity
          style={[styles.button, { bottom: insets.bottom }]}
          onPress={() =>
            router.push({
              pathname: "/setupsociety",
            })
          }
        >
          <Text style={styles.buttonText}>Proceed to Home Screen</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  card: {
    margin: 16,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  textView: {
    marginVertical: 16,
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
  },
  button: {
    backgroundColor: "#5e35b1",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
    marginHorizontal: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  scrollContainer: { padding: 16 }, //
});

export default SetupWingsScreen;
