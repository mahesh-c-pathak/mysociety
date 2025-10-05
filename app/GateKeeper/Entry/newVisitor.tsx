import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter, Stack } from "expo-router";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";
import AppbarComponent from "@/components/AppbarComponent";
import {
  collectionGroup,
  getDocs,
} from "firebase/firestore";

// Define the structure of flatsData
type FlatData = {
  flatType: string;
  resident: string;
  memberStatus: string;
  ownerRegisterd?: string; // Optional property
  renterRegisterd?: string; // Optional property
};

type FlatsData = Record<string, Record<string, Record<string, FlatData>>>;

const flatTypes = ["owner", "Closed", "Rent", "Dead", "Shop"];
const flatColors: Record<string, string> = {
  owner: "#2196F3", // Blue
  Closed: "#808080", // Grey
  Rent: "#FFA500", // Orange
  Dead: "#000000", // Black
  Shop: "#FF00FF", // Magenta
};

const NewVisitor = () => {
  const router = useRouter();
  const { societyName } = useSociety();
  const customFlatsSubcollectionName = `${societyName} flats`;

  const [loading, setLoading] = useState(true);

  const [flatsData, setFlatsData] = useState<FlatsData>({}); // Explicit type for flatsData
  const [selectedWing, setSelectedWing] = useState<string | null>(null);
  const [flatTypeCounts, setFlatTypeCounts] = useState<Record<string, number>>(
    {}
  );

  const fetchFlatsData = async () => {
    setLoading(true);
    try {
      const flatsQuerySnapshot = await getDocs(
        collectionGroup(db, customFlatsSubcollectionName)
      );
      const data: Record<string, any> = {};

      flatsQuerySnapshot.forEach((doc) => {
        const flatData = doc.data();
        const flatId = doc.id;

        const flatPath = doc.ref.path;
        const pathSegments = flatPath.split("/");
        const wing = pathSegments[3];
        const floor = pathSegments[5];

        if (!data[wing]) data[wing] = {};
        if (!data[wing][floor]) data[wing][floor] = {};

        const flatType = flatData.flatType || "";

        data[wing][floor][flatId] = {
          flatType,
          resident: flatData.resident || "",
          memberStatus: flatData.memberStatus || "",
          ownerRegisterd: flatData.ownerRegisterd || "",
          renterRegisterd: flatData.renterRegisterd || "",
        };
      });

      setFlatsData(data);
    } catch (error) {
      console.error("Error fetching flats data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlatsData();
  }, []);

  useEffect(() => {
    // Set the first wing as selected when flatsData is loaded
    if (!selectedWing && Object.keys(flatsData).length > 0) {
      setSelectedWing(Object.keys(flatsData)[0]); // Select the first wing (e.g., "A")
    }
  }, [flatsData]);

  useEffect(() => {
    if (selectedWing && flatsData[selectedWing]) {
      const counts: Record<string, number> = {};
      Object.values(flatsData[selectedWing]).forEach((floor) => {
        Object.values(floor).forEach((flat) => {
          const flatType = flat.flatType || "";
          counts[flatType] = (counts[flatType] || 0) + 1;
        });
      });
      setFlatTypeCounts(counts);
    } else {
      setFlatTypeCounts({});
    }
  }, [selectedWing, flatsData]);

  const handleFlatPress = (
    flatId: string,
    flatType: string,
    floor: string,
    wing: string
  ) => {
    router.push({
      pathname: "/GateKeeper/Entry/addVisitor",
      params: {
        wing: wing,
        floorName: floor,
        flatNumber: flatId,
        flatType,
      },
    });
  };

  const renderFlats = () => {
    if (!selectedWing || !flatsData[selectedWing]) return null;

    return (
      <View style={styles.outerscrollContent}>
        <ScrollView horizontal style={styles.scrollView}>
          <View style={styles.scrollContent}>
            {Object.keys(flatsData[selectedWing])
              .sort((a: string, b: string) => {
                const extractNumber = (floor: string): number => {
                  if (floor === "Floor G") return -1; // Assign a low value to "Floor G"
                  const num = floor.match(/\d+/);
                  return num ? parseInt(num[0], 10) : NaN;
                };

                return extractNumber(b) - extractNumber(a); // Sort descending
              })
              .map((floor) => (
                <View key={floor} style={styles.floorContainer}>
                  <View style={styles.row}>
                    {Object.keys(flatsData[selectedWing][floor]).map((flat) => {
                      const flatData = flatsData[selectedWing][floor][flat];
                      const flatColor =
                        flatColors[flatData.flatType] || flatColors["owner"];
                      return (
                        <TouchableOpacity
                          key={flat}
                          style={[
                            styles.flatContainer,
                            { backgroundColor: flatColor },
                          ]}
                          onPress={() =>
                            handleFlatPress(
                              flat,
                              flatData.flatType,
                              floor,
                              selectedWing
                            )
                          }
                        >
                          <Text style={styles.flatText}>{flat}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppbarComponent title="Select Member" source="Admin" />
      {/* Select Wing */}
      <View style={styles.toggleContainer}>
        {Object.keys(flatsData).map((wing) => (
          <Pressable
            key={wing}
            onPress={() => setSelectedWing(wing)}
            style={[
              styles.toggleButton,
              selectedWing === wing && styles.selectedToggle,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                selectedWing === wing && styles.selectedtoggleText,
              ]}
            >
              {wing}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Legend Container */}

      <View style={styles.legendContainer}>
        {flatTypes.map((type) => (
          <View key={type} style={styles.legendItem}>
            <View style={styles.legendcountContainer}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: flatColors[type] },
                ]}
              />
              <Text style={styles.legendText}>
                ({flatTypeCounts[type] || 0}) {/* Show count or 0 */}
              </Text>
            </View>
            <Text style={styles.legendText}>{type}</Text>
          </View>
        ))}
      </View>

      {/* Selected Wings Flat Grid */}

      {selectedWing && (
        <Text style={styles.headingText}>Wing {selectedWing}</Text>
      )}

      {renderFlats()}
    </View>
  );
};

export default NewVisitor;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
    marginTop: 16,
    alignItems: "center",
  },
  toggleButton: {
    margin: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    height: 50, // Default height
    minWidth: 50, // Optional for consistency
    alignItems: "center", // Center content horizontally
    justifyContent: "center", // Center content vertically
  },
  selectedToggle: {
    backgroundColor: "#6200ee",
    height: 60, // Explicitly set a larger height for the selected button
    minWidth: 60, // Optional for a bigger width
    alignItems: "center", // Center content horizontally
    justifyContent: "center", // Center content vertically
  },
  toggleText: {
    fontWeight: "bold",
    textAlign: "center",
  },
  selectedtoggleText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    textAlign: "center",
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    gap: 8, // Add spacing between legend items (React Native 0.71+)
  },
  legendItem: {
    alignItems: "center", // Center align both color and text
    marginHorizontal: 4, // Space between items
    marginBottom: 8, // Space between rows
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginBottom: 4, // Space between color box and text
  },
  legendText: {
    fontSize: 12, // Adjust text size as needed
    textAlign: "center",
  },
  legendcountContainer: {
    flexDirection: "row",
  },
  headingText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 8,
  },

  outerscrollContent: {
    margin: 16,
    paddingHorizontal: 4,
    paddingTop: 8,
    backgroundColor: "#dddddd",

    borderWidth: 1, // Optional for outline
    borderColor: "#e0e0e0", // Optional for outline
    borderRadius: 8,
  },
  scrollContent: {
    flexDirection: "column", // Stack floors vertically
    paddingHorizontal: 16,
  },
  floorContainer: {
    marginBottom: 8,
  },
  floorTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row", // Flats in a row
    flexWrap: "wrap", // Allows multiple rows
    justifyContent: "center", // Adjust as needed
  },
  flatContainer: {
    backgroundColor: "#4caf50",
    margin: 4,
    minWidth: 70,
    minHeight: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    alignSelf: "stretch", // Allows dynamic height
  },
  scrollView: {
    flexGrow: 1,
  },
  flatList: {
    justifyContent: "center",
    alignItems: "center",
  },

  flatText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginBottom: 6,
  },
});
