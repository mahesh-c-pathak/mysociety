import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  Card,
  Text,
  Button,
  Appbar,
  Portal,
  Dialog,
  TextInput,
  RadioButton,
} from "react-native-paper";
import { db } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";

import { useSafeAreaInsets } from "react-native-safe-area-context";

const flatTypes = ["Owner", "Closed", "Rent", "Dead", "Shop"];
const flatColors: Record<string, string> = {
  Owner: "#2196F3", // Blue
  Closed: "#808080", // Grey
  Rent: "#FFA500", // Orange
  Dead: "#000000", // Black
  Shop: "#FF00FF", // Magenta
};

type FlatData = {
  resident: string;
  flatType: string;
};

type FloorData = {
  [flatNumber: string]: FlatData;
};

const WingSetupScreen: React.FC = () => {
  const { Wing, societyName } = useLocalSearchParams() as {
    Wing: string;
    societyName: string;
  };

  const [floorData, setFloorData] = useState<Record<string, FloorData>>({});
  const [originalFloorData, setOriginalFloorData] = useState<Record<
    string,
    FloorData
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  const screenWidth = useWindowDimensions().width;
  const router = useRouter(); // Expo router for navigation

  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;

  const [showFlatDialog, setShowFlatDialog] = useState(false);
  const [flatInput, setFlatInput] = useState("");
  const [pendingFloor, setPendingFloor] = useState<string | null>(null);

  const [mode, setMode] = useState<"status" | "add" | "delete">("status");

  const fetchWingData = async () => {
    try {
      const wingRef = doc(
        db,
        "Societies",
        societyName as string,
        customWingsSubcollectionName,
        Wing as string
      );
      const wingSnap = await getDoc(wingRef);

      if (!wingSnap.exists()) {
        alert("Wing does not exist!");
        return;
      }

      const floorsRef = collection(wingRef, customFloorsSubcollectionName);
      const floorSnaps = await getDocs(floorsRef);

      if (floorSnaps.empty) {
        alert(`No data found for Wing ${Wing}`);
        return;
      }

      const fetchedFloorData: Record<string, FloorData> = {};
      await Promise.all(
        floorSnaps.docs.map(async (floorDoc) => {
          const flatsRef = collection(
            floorDoc.ref,
            customFlatsSubcollectionName
          );
          const flatSnaps = await getDocs(flatsRef);

          const flatData: FloorData = {};
          flatSnaps.forEach((flatDoc) => {
            const { flatType = "Owner", resident = "Owner" } =
              flatDoc.data() as FlatData;
            flatData[flatDoc.id] = { flatType, resident };
          });

          fetchedFloorData[floorDoc.id] = flatData;
        })
      );

      setFloorData(fetchedFloorData);
      setOriginalFloorData(JSON.parse(JSON.stringify(fetchedFloorData)));
      // console.log("fetchedFloorData", fetchedFloorData);
    } catch (error) {
      console.error("Error fetching wing data:", error);
      alert("Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setFloorData({});
      setLoading(true);
      fetchWingData();
    }, [Wing])
  );

  const handleFlatPress = (floor: string, flatNumber: string) => {
    if (floorData) {
      setFloorData((prevFloorData) => {
        if (!prevFloorData) return prevFloorData;

        // Ensure flatType exists before calling indexOf
        const currentFlatData = prevFloorData[floor]?.[flatNumber];
        if (!currentFlatData) return prevFloorData;

        const currentType = currentFlatData.flatType;
        const currentIndex = flatTypes.indexOf(currentType);

        // Default to the first type if the current type is invalid
        const nextType =
          flatTypes[(currentIndex + 1) % flatTypes.length] || flatTypes[0];
        return {
          ...prevFloorData,
          [floor]: {
            ...prevFloorData[floor],
            [flatNumber]: { ...currentFlatData, flatType: nextType },
          },
        };
      });
    }
  };

  const renderFlat = ({ item, floor }: { item: string; floor: string }) => {
    const flatType = floorData?.[floor]?.[item]?.flatType || "Owner"; // Default to 'Owner'
    const backgroundColor = flatColors[flatType] || flatColors["Owner"]; // Fallback color

    return (
      <View
        style={{
          position: "relative",
          width: screenWidth / 3 - 20,
        }}
      >
        <Card
          style={[
            styles.card,
            {
              backgroundColor,
              height: 48,
            },
          ]}
          mode="elevated"
        >
          {/* 🔹 Delete icon in top-right corner */}
          <TouchableOpacity
            onPress={() => mode === "status" && handleFlatPress(floor, item)}
          >
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardText}>
                {item}
              </Text>
            </Card.Content>
          </TouchableOpacity>
        </Card>
        {/* ❌ Delete icon (top-right corner of the card) */}
        {/* Show Delete Icon only in Delete mode */}
        {mode === "delete" && (
          <TouchableOpacity
            onPress={() => handleDeleteFlat(floor, item)}
            style={styles.deleteIcon}
          >
            <Text style={styles.deleteText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFloor = ({ item }: { item: [string, FloorData] }) => {
    const [floor, flats] = item;

    const flatNumbers = Object.keys(flats);

    return (
      <View>
        <FlatList
          data={flatNumbers}
          keyExtractor={(flatNumber) => `${floor}-${flatNumber}`}
          renderItem={({ item }) => renderFlat({ item, floor })}
          //numColumns={3}
          contentContainerStyle={styles.flatListContent}
          horizontal={true}
          scrollEnabled={false} // Disable scrolling
        />
      </View>
    );
  };

  const handleContinue = async () => {
    if (!floorData || !originalFloorData) return;

    const changes: string[] = [];
    const updates: {
      floor: string;
      flatNumber: string;
      oldType: string;
      newType: string;
    }[] = [];

    // Identify modified fields
    for (const [floor, flats] of Object.entries(floorData)) {
      for (const [flatNumber, flat] of Object.entries(flats)) {
        const originalFlat = originalFloorData[floor]?.[flatNumber];
        if (!originalFlat || flat.flatType !== originalFlat.flatType) {
          changes.push(
            `Flat ${flatNumber}: ${originalFlat?.flatType || "N/A"} → ${
              flat.flatType
            }`
          );
          updates.push({
            floor,
            flatNumber,
            oldType: originalFlat?.flatType || "N/A",
            newType: flat.flatType,
          });
        }
      }
    }

    if (changes.length > 0) {
      Alert.alert("Confirm Changes", changes.join("\n"), [
        {
          text: "NO",
          onPress: () =>
            router.push({
              pathname: "/setupsociety/SetupWingsScreen",
              params: { societyName },
            }),
          style: "cancel",
        },
        {
          text: "YES",
          onPress: async () => {
            try {
              // Apply updates to Firestore
              for (const update of updates) {
                const { floor, flatNumber, newType } = update;
                const flatRef = doc(
                  db,
                  "Societies",
                  societyName as string,
                  customWingsSubcollectionName,
                  Wing as string,
                  customFloorsSubcollectionName,
                  floor,
                  customFlatsSubcollectionName,
                  flatNumber
                );

                // Determine the resident value based on flatType
                const resident = newType === "Rent" ? "Renter" : "Owner";
                const renterRegisterd =
                  newType === "Rent" ? "Notregistered" : "NA";

                await updateDoc(flatRef, {
                  flatType: newType,
                  resident: resident,
                  renterRegisterd: renterRegisterd,
                });
              }
              // After all updates, navigate to SetupWingsScreen
              router.replace({
                pathname: "/setupsociety/SetupWingsScreen",
                params: { societyName },
              });
            } catch (error) {
              console.error("Error updating data:", error);
              alert("Failed to save changes.");
            }
          },
        },
      ]);
    } else {
      router.push({
        pathname: "/setupsociety/SetupWingsScreen",
        params: { societyName },
      });
    }
  };

  // 🔹 Delete Flat
  const handleDeleteFlat = (floor: string, flatNumber: string) => {
    Alert.alert("Delete Flat", `Delete flat ${flatNumber}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const flatRef = doc(
              db,
              "Societies",
              societyName,
              customWingsSubcollectionName,
              Wing,
              customFloorsSubcollectionName,
              floor,
              customFlatsSubcollectionName,
              flatNumber
            );
            await deleteDoc(flatRef);
            setFloorData((prev) => {
              const updated = { ...prev };
              delete updated[floor][flatNumber];

              return updated;
            });
          } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to delete flat.");
          }
        },
      },
    ]);
  };

  // 🔹 Add new floor (single function)
  const handleAddFloor = async () => {
    try {
      const hasGround = Object.keys(floorData).includes("Floor G");
      let newFloorName = "Floor G";

      if (hasGround) {
        // Find all SB floors
        const sbFloors = Object.keys(floorData).filter((f) =>
          f.startsWith("Floor SB")
        );
        const nextIndex =
          sbFloors.length > 0
            ? Math.max(
                ...sbFloors.map((f) => parseInt(f.replace("Floor SB", "")))
              ) + 1
            : 1;
        newFloorName = `Floor SB${nextIndex}`;
      }

      // Step 1: Create floor doc
      const floorRef = doc(
        db,
        "Societies",
        societyName,
        customWingsSubcollectionName,
        Wing,
        customFloorsSubcollectionName,
        newFloorName
      );
      await setDoc(floorRef, { createdAt: new Date() });

      // Step 2: Ask for flat names (comma separated)
      setPendingFloor(newFloorName);
      setFlatInput("");
      setShowFlatDialog(true);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not add floor.");
    }
  };

  // 🔹 Confirm flat names input and add to Firestore
  const handleConfirmFlats = async () => {
    if (!pendingFloor) return;

    const flats = flatInput
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    if (flats.length === 0) {
      Alert.alert("Error", "Enter at least one flat name.");
      return;
    }

    try {
      const updates: FloorData = {};
      for (const flat of flats) {
        const flatRef = doc(
          db,
          "Societies",
          societyName,
          customWingsSubcollectionName,
          Wing,
          customFloorsSubcollectionName,
          pendingFloor,
          customFlatsSubcollectionName,
          flat
        );
        await setDoc(flatRef, { flatType: "Owner", resident: "Owner" });
        updates[flat] = { flatType: "Owner", resident: "Owner" };
      }

      setFloorData((prev) => ({ ...prev, [pendingFloor]: updates }));

      setShowFlatDialog(false);
      setPendingFloor(null);
      // Re-run screen lifecycle (triggers useFocusEffect or useEffect)
      router.replace({
        pathname: "/setupsociety/WingSetupScreen",
        params: { societyName, Wing },
      });
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to add flats.");
    }
  };

  const handleCancelAddFlats = async () => {
    if (!pendingFloor) return;

    try {
      const floorRef = doc(
        db,
        "Societies",
        societyName,
        customWingsSubcollectionName,
        Wing,
        customFloorsSubcollectionName,
        pendingFloor
      );
      await deleteDoc(floorRef); // remove the just-added floor
      console.log(`Deleted pending floor: ${pendingFloor}`);
    } catch (error) {
      console.error("Failed to delete pending floor:", error);
    } finally {
      setPendingFloor(null);
      setShowFlatDialog(false);
    }
  };

  // 🔹 Activity Indicator

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Loading Wing Setup...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {/* Top Appbar */}
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => router.back()} color="#fff" />
          <Appbar.Content
            title={`Wing Setup - ${Wing}`}
            titleStyle={styles.titleStyle}
          />
        </Appbar.Header>
        <Text style={styles.heading}>Wing Setup - {Wing}</Text>
        <Button
          mode="text"
          onPress={() =>
            Alert.alert(
              "Do you want to Setup again?",
              "This will remove your current setup and can't recover again",
              [
                {
                  text: "NO",
                  onPress: () => {}, // Dismiss the alert
                  style: "cancel",
                },
                {
                  text: "YES",
                  onPress: () =>
                    router.push({
                      pathname: `/setupsociety/[Wing]`,
                      params: { societyName, Wing },
                    }),
                },
              ]
            )
          }
        >
          Setup Again?
        </Button>
        {/* Legend Section */}
        <View style={styles.legendContainer}>
          {flatTypes.map((type) => (
            <View key={type} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: flatColors[type] },
                ]}
              />
              <Text>{type}</Text>
            </View>
          ))}
        </View>

        {/* ✅ Radio Buttons Section */}
        <View style={styles.radioGroup}>
          <View style={styles.radioItem}>
            <RadioButton
              value="status"
              status={mode === "status" ? "checked" : "unchecked"}
              onPress={() => setMode("status")}
            />
            <Text>Change Flat Status</Text>
          </View>

          <View style={styles.radioItem}>
            <RadioButton
              value="add"
              status={mode === "add" ? "checked" : "unchecked"}
              onPress={() => setMode("add")}
            />
            <Text>Add Floor</Text>
          </View>

          <View style={styles.radioItem}>
            <RadioButton
              value="delete"
              status={mode === "delete" ? "checked" : "unchecked"}
              onPress={() => setMode("delete")}
            />
            <Text>Delete Flats</Text>
          </View>
        </View>

        {/* ✅ Show Add Floor button only in Add mode */}
        {mode === "add" && (
          <Button
            icon="plus"
            mode="contained-tonal"
            style={{ marginVertical: 8, marginHorizontal: 48 }}
            onPress={handleAddFloor}
          >
            Add Floor
          </Button>
        )}

        <ScrollView style={styles.scrollcontainer} horizontal={true}>
          <FlatList
            data={Object.entries(floorData || {}).sort(([a], [b]) => {
              const extractNumber = (floor: string): number => {
                if (floor === "Floor G") return 0; // Ground = 0

                const sbMatch = floor.match(/SB(\d+)/); // SB1, SB2, ...
                if (sbMatch) return -parseInt(sbMatch[1], 10); // Below ground = negative

                const upMatch = floor.match(/(\d+)/); // Floor 1, Floor 2, ...
                return upMatch ? parseInt(upMatch[1], 10) : 0;
              };

              // 🔁 Sort from highest to lowest
              return extractNumber(b) - extractNumber(a);
            })}
            keyExtractor={([floor]) => floor}
            renderItem={renderFloor}
            //scrollEnabled={false} // Disable scrolling
            contentContainerStyle={styles.flatListContent}
          />
        </ScrollView>

        <View style={[styles.fixedButtonContainer, { bottom: insets.bottom }]}>
          <Button
            mode="contained"
            onPress={handleContinue}
            style={styles.button}
          >
            Continue
          </Button>
        </View>

        {/* 🔹 Flat names dialog */}
        <Portal>
          <Dialog visible={showFlatDialog} onDismiss={handleCancelAddFlats}>
            <Dialog.Title>Add Flats to {pendingFloor}</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Enter flat numbers (comma separated)"
                value={flatInput}
                onChangeText={setFlatInput}
                autoFocus
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={handleCancelAddFlats}>Cancel</Button>
              <Button onPress={handleConfirmFlats}>Add Flats</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollcontainer: {
    margin: 16,
    flexGrow: 1,
    backgroundColor: "#DAD8C9",
    padding: 8,
    marginBottom: 80, // ✅ adds visible gap from bottom
  },
  header: { backgroundColor: "#6200ee" },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },

  flatListContent: { paddingHorizontal: 8, flexGrow: 1 },
  card: {
    margin: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    elevation: 2,
  },
  cardText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  button: { marginTop: 2, alignSelf: "center" },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  legendItem: {
    alignItems: "center",
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginBottom: 4,
  },

  fixedButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: "#fff", // ensures button is visible on top of list
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  radioGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 12,
    alignItems: "center",
    marginHorizontal: 12,
  },
  radioItem: { flexDirection: "row", alignItems: "center" },
  deleteIcon: {
    position: "absolute",
    top: 2,
    right: 2,
    zIndex: 5,
    backgroundColor: "white",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { color: "#ff0000", fontSize: 16, fontWeight: "bold" },
});

export default WingSetupScreen;
