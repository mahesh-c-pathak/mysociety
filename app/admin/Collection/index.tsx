import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from "react-native";
import React, { useEffect, useState } from "react";

import { useNavigation } from "@react-navigation/native";

import { useRouter } from "expo-router";
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

import { useSociety } from "@/utils/SocietyContext";

import AppbarComponent from "@/components/AppbarComponent";
import AppbarMenuComponent from "@/components/AppbarMenuComponent";
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";
import { getFlatCurrentBalance } from "@/utils/getFlatCurrentBalance";

// Define the structure of flatsData
type FlatData = {
  flatType: string;
  resident: string;
  memberStatus: string;
  ownerRegisterd?: string; // Optional property
  renterRegisterd?: string; // Optional property
  billStatus: string;
  billAmount?: number;
  overdueDays?: number;
  flatColor: string;
  flatCurrentBalance: number;
};

type FlatsData = Record<string, Record<string, Record<string, FlatData>>>;

const StatusType = [
  "paid",
  "unpaid",
  "Pending Approval",
  "overdue",
  "Advanced Payment",
];

const flatColors: Record<string, string> = {
  paid: "#4CAF50", // Green
  unpaid: "#FA8072", // Salmon
  "Pending Approval": "#FFEB3B", // Yellow
  Overdue: "#FF0000", // Red
  "Advanced Payment": "#2196F3", // Blue
};

const StatusColor: Record<string, string> = {
  paid: "#4CAF50", // Green
  unpaid: "#FA8072", // Salmon
  "Pending Approval": "#FFEB3B", // Yellow
  overdue: "#FF0000", // Red
  "Advanced Payment": "#2196F3", // Blue
};

const CollectionNew = () => {
  const { societyName: mysocietyName } = useSociety();

  const [loading, setLoading] = useState(true);
  const [loadingWing, setLoadingWing] = useState(false);
  const [progress, setProgress] = useState(0);

  const router = useRouter();
  useCustomBackHandler("/admin"); // back always goes to Screen3

  const navigation = useNavigation();

  const customFlatsSubcollectionName = `${mysocietyName} flats`;
  // const customFlatsBillsSubcollectionName = `${mysocietyName} bills`;

  const customFlatsBillsSubcollectionName = "flatbills";

  const customWingsSubcollectionName = `${mysocietyName} wings`;
  const [wings, setWings] = useState<string[]>([]);

  const customFloorsSubcollectionName = `${mysocietyName} floors`;

  const [selectedWing, setSelectedWing] = useState<string | null>(null);

  const [flatsData, setFlatsData] = useState<FlatsData>({}); // Explicit type for flatsData
  const [flatTypeCounts, setFlatTypeCounts] = useState<Record<string, number>>(
    {}
  );

  const currentDate = new Date();
  currentDate.setUTCHours(0, 0, 0, 0); // Normalize to start of day in UTC

  // const dateString = new Date().toISOString().split("T")[0];

  useEffect(() => {
    // Dynamically hide the header for this screen
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const getFlatStatusAndColor = (bills: string[]) => {
    if (bills.includes("Pending Approval")) {
      return {
        flatStatus: "Pending Approval",
        flatColor: StatusColor["Pending Approval"],
      };
    }
    if (bills.includes("overdue")) {
      return { flatStatus: "overdue", flatColor: StatusColor["overdue"] };
    }
    if (bills.includes("unpaid")) {
      return { flatStatus: "unpaid", flatColor: StatusColor["unpaid"] };
    }
    if (bills.includes("Advanced Payment")) {
      return {
        flatStatus: "Advanced Payment",
        flatColor: StatusColor["Advanced Payment"],
      };
    }
    return { flatStatus: "paid", flatColor: StatusColor["paid"] };
  };

  useEffect(() => {
    const fetchWings = async () => {
      if (!mysocietyName) {
        console.error("Error: Society name (localName) is missing.");
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const wingsCollectionRef = collection(
          db,
          "Societies",
          mysocietyName,
          customWingsSubcollectionName
        );
        const wingsSnapshot = await getDocs(wingsCollectionRef);
        if (!wingsSnapshot.empty) {
          const wingIds = wingsSnapshot.docs.map((doc) => doc.id);
          setWings(wingIds);
        } else {
          console.warn("No wings found for society:", mysocietyName);
          setWings([]);
        }
      } catch (error) {
        console.error("Error fetching wings:", error);
        setWings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWings();
  }, [customWingsSubcollectionName, mysocietyName]);

  useEffect(() => {
    // Set the first wing as selected when wings are loaded
    if (!selectedWing && wings.length > 0) {
      setSelectedWing(wings[0]); // Select the first wing (e.g., "A")
    }
  }, [wings, selectedWing]);

  useEffect(() => {
    const fetchFlatBillStatus = async () => {
      try {
        if (!mysocietyName || !selectedWing) {
          console.warn("Society name or selected wing is missing.");
          return;
        }
        // 🧠 Skip if data for this wing already exists
        if (flatsData[selectedWing]) {
          console.log(`✅ Using cached data for Wing ${selectedWing}`);
          return;
        }

        console.log(`⬇️ Fetching data for Wing ${selectedWing}...`);
        setLoadingWing(true);
        setProgress(0);

        const data: Record<string, any> = { ...flatsData };
        data[selectedWing] = {}; // initialize this wing
        const currentDate = new Date();

        // Construct reference to the floors collection for the current wing
        const floorsCollectionRef = collection(
          db,
          "Societies",
          mysocietyName as string,
          customWingsSubcollectionName,
          selectedWing,
          customFloorsSubcollectionName
        );

        const floorsSnapshot = await getDocs(floorsCollectionRef);

        // Collect all flats across floors (in parallel)
        const allnewFlatDocs: any[] = [];

        if (!floorsSnapshot.empty) {
          const floorPromises = floorsSnapshot.docs.map(async (floorDoc) => {
            const floorName = floorDoc.id;
            const flatsRef = collection(
              floorDoc.ref,
              customFlatsSubcollectionName
            );
            const flatsSnapshot = await getDocs(flatsRef);

            return flatsSnapshot.docs.map((flatDoc) => ({
              flatDoc,
              floorName,
            }));
          });

          // Wait for all floors to complete fetching in parallel
          const floorResults = await Promise.all(floorPromises);

          // Flatten the array of arrays into a single list
          floorResults.forEach((floorFlats) => {
            allnewFlatDocs.push(...floorFlats);
          });
        }

        // ✅ Updated helper function for allnewFlatDocs
        const processBatch = async (batch: typeof allnewFlatDocs) => {
          await Promise.all(
            batch.map(async ({ flatDoc, floorName }) => {
              try {
                const flatData = flatDoc.data();
                const flatId = flatDoc.id;
                const flatPath = flatDoc.ref.path;
                const pathSegments = flatPath.split("/");
                const wing = pathSegments[3];
                const floor = floorName; // use provided floorName instead of parsing

                if (!data[wing]) data[wing] = {};
                if (!data[wing][floor]) data[wing][floor] = {};

                const flatType = flatData.flatType || "";

                // ✅ Fetch bills and balance in parallel
                const flatBillsRef = collection(
                  flatDoc.ref,
                  customFlatsBillsSubcollectionName
                );
                const [billsSnapshot, flatCurrentBalance] = await Promise.all([
                  getDocs(flatBillsRef),
                  getFlatCurrentBalance(flatPath, mysocietyName, flatId),
                ]);

                // Process bills
                const billStatuses: string[] = [];
                let flatUnpaidAmount = 0;
                let maxOverdueDays = 0;

                billsSnapshot.forEach((billDoc) => {
                  const billData = billDoc.data();
                  if (!billData?.status) return;

                  if (billData.status === "unpaid") {
                    const dueDate = new Date(`${billData.dueDate}T00:00:00`);
                    const overdueDays = Math.floor(
                      (currentDate.getTime() - dueDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    if (overdueDays > 0) {
                      billStatuses.push("overdue");
                      maxOverdueDays = Math.max(maxOverdueDays, overdueDays);
                    } else {
                      billStatuses.push("unpaid");
                    }
                    flatUnpaidAmount += billData.amount || 0;
                  } else {
                    billStatuses.push(billData.status);
                  }
                });

                const { flatStatus, flatColor } =
                  getFlatStatusAndColor(billStatuses);

                data[wing][floor][flatId] = {
                  flatType,
                  resident: flatData.resident || "",
                  memberStatus: flatData.memberStatus || "",
                  ownerRegisterd: flatData.ownerRegisterd || "",
                  renterRegisterd: flatData.renterRegisterd || "",
                  billStatus: flatStatus,
                  overdueDays: maxOverdueDays,
                  billAmount: flatUnpaidAmount,
                  flatColor,
                  flatCurrentBalance,
                };
              } catch (err) {
                console.warn("Error processing flat:", err);
              }
            })
          );
        };

        // 🚀 Process in batches of 25 to prevent overload
        const BATCH_SIZE = 25;
        for (let i = 0; i < allnewFlatDocs.length; i += BATCH_SIZE) {
          const batch = allnewFlatDocs.slice(i, i + BATCH_SIZE);
          await processBatch(batch);
          setProgress(
            Math.min(
              100,
              Math.round(((i + batch.length) / allnewFlatDocs.length) * 100)
            )
          );
        }

        setFlatsData(data);
      } catch (error) {
        console.error("Error fetching flats data:", error);
      } finally {
        setLoadingWing(false);
      }
    };

    fetchFlatBillStatus();
  }, [
    customFlatsBillsSubcollectionName,
    customFlatsSubcollectionName,
    customFloorsSubcollectionName,
    customWingsSubcollectionName,
    mysocietyName,
    selectedWing,
  ]);

  // console.log("flatsData", flatsData);
  // console.log("");
  // console.log("");

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
    console.log(
      `Yes pressed for flat: ${flatId}, flatType: ${flatType}, Floor: ${floor}, Wing: ${wing}`
    );

    router.push({
      pathname: "/admin/Collection/FlatCollectionSummary",
      params: {
        wing: wing,
        floorName: floor,
        flatNumber: flatId,
      },
    });
  };

  const [menuVisible, setMenuVisible] = useState(false);

  const handleMenuOptionPress = (option: string) => {
    console.log(`${option} selected`);
    if (option === "Close Menu") {
      setMenuVisible(false);
    } else {
      // Handle other options
      console.log(`${option} clicked`);
    }
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };

  const resetFilters = () => {
    console.log("Reset Filter Pressed");
  };

  // Inside your component
  const renderFlatsNew = () => {
    if (!selectedWing || !flatsData[selectedWing]) return null;

    // Prepare a flat array of floors with their flats
    const floorArray = Object.keys(flatsData[selectedWing])
      .sort((a: string, b: string) => {
        const extractNumber = (floor: string): number => {
          if (floor === "Floor G") return -1;
          const num = floor.match(/\d+/);
          return num ? parseInt(num[0], 10) : NaN;
        };
        return extractNumber(b) - extractNumber(a);
      })
      .map((floor) => ({
        floor,
        flats: Object.keys(flatsData[selectedWing][floor]).map((flatId) => ({
          flatId,
          ...flatsData[selectedWing][floor][flatId],
        })),
      }));

    const renderFlatItem = (flat: any, floor: string) => {
      // 🧠 Skip rendering if flatType is "dead"
      if (flat.flatType?.toLowerCase() === "dead") {
        return (
          <View
            key={flat.flatId}
            style={{
              width: 70, // keep consistent layout
              height: 60,
              margin: 4,
            }}
          />
        );
      }

      return (
        <Pressable
          key={flat.flatId}
          onLongPress={() =>
            handleFlatPress(flat.flatId, flat.flatType, floor, selectedWing)
          }
          delayLongPress={300} // default is 500 ms, tweak as needed
          style={({ pressed }) => [
            styles.flatContainer,
            {
              backgroundColor: flat.flatColor || flatColors["paid"],
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <Text style={styles.flatText}>{flat.flatId}</Text>
          {flat.billStatus.toLowerCase() === "unpaid" && (
            <Text style={styles.billText}>₹ {flat.billAmount}</Text>
          )}
          {flat.billStatus === "overdue" && (
            <>
              <Text style={styles.billText}>{flat.overdueDays} days</Text>
              <Text style={styles.billText}>₹ {flat.billAmount}</Text>
            </>
          )}
          {flat.flatCurrentBalance > 0 && (
            <View
              style={{
                backgroundColor: "#3F704D",
                marginBottom: 2,
                width: "100%",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={[styles.billText, { fontSize: 12 }]}>
                ₹ {flat.flatCurrentBalance.toFixed(2)}
              </Text>
            </View>
          )}
        </Pressable>
      );
    };

    return (
      <ScrollView style={styles.scrollcontainer} horizontal={true}>
        {loadingWing && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
            <Text style={styles.progressText}>Loading {progress}%</Text>
          </View>
        )}
        <FlatList
          data={floorArray}
          keyExtractor={(item) => item.floor}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={styles.floorContainer}>
              <FlatList
                data={item.flats}
                keyExtractor={(flat) => flat.flatId}
                renderItem={({ item: flat }) =>
                  renderFlatItem(flat, item.floor)
                }
                horizontal={true}
                scrollEnabled={false} // Disable scrolling
              />
            </View>
          )}
        />
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Appbar */}
      <AppbarComponent
        title="Collection New"
        source="Admin"
        onPressFilter={() => resetFilters()}
        onPressThreeDot={() => setMenuVisible(!menuVisible)}
      />

      {/* Three-dot Menu */}
      {/* Custom Menu */}
      {menuVisible && (
        <AppbarMenuComponent
          items={["Download PDF", "Download Excel", "Close Menu"]}
          onItemPress={handleMenuOptionPress}
          closeMenu={closeMenu}
        />
      )}

      {/* Select Wing */}
      <ScrollView
        horizontal
        contentContainerStyle={styles.toggleContainer}
        showsHorizontalScrollIndicator={false}
      >
        {wings.map((wing) => (
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
      </ScrollView>

      {/* Legend Container */}

      <View style={styles.legendContainer}>
        {StatusType.map((type) => (
          <View key={type} style={styles.legendItem}>
            <View style={styles.legendcountContainer}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: StatusColor[type] },
                ]}
              />
              <Text style={styles.legendText}>
                ({flatTypeCounts[type] || 0}) {/* Show count or 0 */}
              </Text>
            </View>
            <Text style={[styles.legendText, { flexWrap: "wrap" }]}>
              {type.split(" ").map((word, index) => (
                <Text key={index}>
                  {word}
                  {"\n"}
                </Text>
              ))}
            </Text>
          </View>
        ))}
      </View>

      {/* Selected Wings Flat Grid */}

      {selectedWing && (
        <Text style={styles.headingText}>Wing {selectedWing}</Text>
      )}

      {renderFlatsNew()}
    </View>
  );
};

export default CollectionNew;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "flex-start", // 👈 prevents center-jump
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    margin: 16,
    paddingRight: 48,
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

  flatText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginBottom: 6,
  },
  headingText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 8,
  },

  floorContainer: {
    marginBottom: 8,
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

  billText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "bold",
    margin: 2,
  },
  scrollcontainer: {
    margin: 16,
    flexGrow: 1,
    backgroundColor: "#F5F5DC",
    padding: 8,
    marginBottom: 80, // ✅ adds visible gap from bottom
  },
  progressContainer: {
    width: "100%",
    height: 20,
    backgroundColor: "#eee",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#6200ee",
  },
  progressText: {
    textAlign: "center",
    marginTop: 4,
    fontSize: 12,
    color: "#333",
  },
});
