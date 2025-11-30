// components/WingsFlatsGrid.tsx
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FlatData = {
  flatType: string;
  resident: string;
  memberStatus: string;
  ownerRegisterd?: string;
  renterRegisterd?: string;
};

type FlatsData = Record<string, Record<string, Record<string, FlatData>>>;

const flatTypes = ["owner", "Closed", "Rent", "Dead", "Shop", "Registerd"];
const flatColors: Record<string, string> = {
  owner: "#2196F3",
  Closed: "#808080",
  Rent: "#FFA500",
  Dead: "#000000",
  Shop: "#FF00FF",
  Registerd: "#2E8B57", // Green
};

interface WingsFlatsGridProps {
  flatsData: FlatsData;
  onFlatPress: (
    flatId: string,
    flatType: string,
    floor: string,
    wing: string
  ) => void;
  initialSelectedWing?: string | null; // new prop
  showRegisteredLegend?: boolean; // ✅ optional, defaults to false
}

const WingsFlatsGrid: React.FC<WingsFlatsGridProps> = ({
  flatsData,
  onFlatPress,
  initialSelectedWing = null,
  showRegisteredLegend = false, // ✅ default false
}) => {
  const insets = useSafeAreaInsets();
  const [selectedWing, setSelectedWing] = useState<string | null>(
    initialSelectedWing
  );
  const [flatTypeCounts, setFlatTypeCounts] = useState<Record<string, number>>(
    {}
  );

  useEffect(() => {
    if (!selectedWing && Object.keys(flatsData).length > 0) {
      setSelectedWing(Object.keys(flatsData)[0]);
    }
  }, [flatsData, selectedWing]);

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

  return (
    <View style={styles.container}>
      {/* Wing selector */}
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

      {/* Legend */}
      <View style={styles.legendContainer}>
        {flatTypes
          .filter((type) => {
            if (type === "Registerd" && !showRegisteredLegend) return false;
            return true;
          })
          .map((type) => (
            <View key={type} style={styles.legendItem}>
              <View style={styles.legendcountContainer}>
                <View
                  style={[
                    styles.legendColor,
                    { backgroundColor: flatColors[type] },
                  ]}
                />
                <Text style={styles.legendText}>
                  ({flatTypeCounts[type] || 0})
                </Text>
              </View>
              <Text style={styles.legendText}>{type}</Text>
            </View>
          ))}
      </View>

      {/* Flats grid */}
      {selectedWing && (
        <>
          <Text style={styles.headingText}>Wing {selectedWing}</Text>
          <View style={styles.outerscrollContent}>
            <ScrollView style={styles.verticalScroll}>
              <ScrollView
                horizontal
                style={styles.scrollView}
                contentContainerStyle={{
                  paddingBottom: insets.bottom + 100,
                }}
              >
                <View style={styles.scrollContent}>
                  {Object.keys(flatsData[selectedWing])
                    .sort((a, b) => {
                      const extractNumber = (floor: string): number => {
                        if (floor === "Floor G") return -1;
                        const num = floor.match(/\d+/);
                        return num ? parseInt(num[0], 10) : NaN;
                      };
                      return extractNumber(b) - extractNumber(a);
                    })
                    .map((floor) => (
                      <View key={floor} style={styles.floorContainer}>
                        <View style={styles.row}>
                          {Object.keys(flatsData[selectedWing][floor]).map(
                            (flat) => {
                              const flatData =
                                flatsData[selectedWing][floor][flat];

                              // 🧠 Skip rendering if flatType is "dead" (case-insensitive)
                              if (flatData.flatType?.toLowerCase() === "dead") {
                                return (
                                  <View
                                    key={flat}
                                    style={{
                                      width: 70, // keep consistent layout
                                      height: 60,
                                      margin: 4,
                                    }}
                                  />
                                );
                              }

                              const flatColor =
                                flatData.memberStatus === "Registered" &&
                                showRegisteredLegend
                                  ? flatColors["Registerd"]
                                  : flatColors[flatData.flatType] ||
                                    flatColors["owner"];
                              return (
                                <TouchableOpacity
                                  key={flat}
                                  style={[
                                    styles.flatContainer,
                                    { backgroundColor: flatColor },
                                  ]}
                                  onPress={() =>
                                    onFlatPress(
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
                            }
                          )}
                        </View>
                      </View>
                    ))}
                </View>
              </ScrollView>
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
};

export default WingsFlatsGrid;

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    height: 50,
    minWidth: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedToggle: {
    backgroundColor: "#6200ee",
    height: 60,
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
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
    gap: 8,
  },
  legendItem: {
    alignItems: "center",
    marginHorizontal: 4,
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginBottom: 4,
  },
  legendText: {
    fontSize: 12,
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
    flex: 1,
    margin: 16,
    paddingHorizontal: 4,
    paddingTop: 8,
    backgroundColor: "#dddddd",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    marginBottom: 64,
  },
  scrollContent: {
    flexDirection: "column",
    paddingHorizontal: 16,
  },
  floorContainer: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  flatContainer: {
    margin: 4,
    minWidth: 70,
    minHeight: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    alignSelf: "stretch",
  },
  scrollView: {
    flexGrow: 1,
  },
  flatText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  verticalScroll: {
    flexGrow: 0,
  },
});
