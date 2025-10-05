import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { Button, Appbar } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { db } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  writeBatch,
} from "firebase/firestore";
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";

const WingScreen: React.FC = () => {
  const { Wing, societyName } = useLocalSearchParams(); // Retrieves wing name from the route params
  const sanitizedWing = (Wing as string).trim(); // Sanitize the wing name
  const wingLetter = sanitizedWing.split("-").pop(); // Extracts the wing identifier (e.g., 'A' from 'Wing-A')

  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;
  const customFlatsBillsSubcollectionName = `${societyName} bills`;

  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [totalFloors, setTotalFloors] = useState<string>("");
  const [unitsPerFloor, setUnitsPerFloor] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<number | null>(null);

  const numberFormats = [
    { label: "301, 302, 303, 201,202,203, 101,102,102", type: "floorUnit" },
    { label: "7, 8, 9,4,5,6,1,2,3", type: "sequential" },
    { label: "201,202,203,101,102,103, G1, G2,G3", type: "groundUnit" },
    { label: "4,5,6,1,2,3, G1, G2,G3", type: "groundSequential" },
    { label: "103,203,303,102,202,302,101,201,301", type: "vertical" },
  ];

  const generateFloorWiseNumbers = () => {
    const floors = parseInt(totalFloors);
    const units = parseInt(unitsPerFloor);

    if (isNaN(floors) || isNaN(units) || selectedFormat === null) {
      alert(
        "Please enter valid numbers for floors, units, and select a format!"
      );
      return null;
    }

    const formatType = numberFormats[selectedFormat].type;
    const result: Record<string, string[]> = {}; // Store floor -> flat numbers mapping

    if (formatType === "floorUnit") {
      for (let floor = 1; floor <= floors; floor++) {
        result[`Floor ${floor}`] = [];
        for (let unit = 1; unit <= units; unit++) {
          result[`Floor ${floor}`].push(`${floor}0${unit}`);
        }
      }
    } else if (formatType === "sequential") {
      let counter = 1;
      for (let floor = 1; floor <= floors; floor++) {
        result[`Floor ${floor}`] = [];
        for (let unit = 1; unit <= units; unit++) {
          result[`Floor ${floor}`].push(counter.toString());
          counter++;
        }
      }
    } else if (formatType === "groundUnit") {
      for (let floor = 0; floor < floors; floor++) {
        const floorKey = `Floor ${floor === 0 ? "G" : floor}`;
        result[floorKey] = [];
        for (let unit = 1; unit <= units; unit++) {
          result[floorKey].push(floor === 0 ? `G${unit}` : `${floor}0${unit}`);
        }
      }
    } else if (formatType === "vertical") {
      for (let unit = 1; unit <= units; unit++) {
        for (let floor = 1; floor <= floors; floor++) {
          const floorKey = `Floor ${floor}`;
          if (!result[floorKey]) result[floorKey] = [];
          result[floorKey].push(`${unit}0${floor}`);
        }
      }
    } else if (formatType === "groundSequential") {
      let counter = 1;
      result["Floor G"] = [];
      for (let unit = 1; unit <= units; unit++) {
        result["Floor G"].push(`G${unit}`);
      }
      for (let floor = 1; floor < floors; floor++) {
        result[`Floor ${floor}`] = [];
        for (let unit = 1; unit <= units; unit++) {
          result[`Floor ${floor}`].push(counter.toString());
          counter++;
        }
      }
    }

    return result;
  };

  const userWingUpdate = async (societyname: string, wingname: string) => {
    try {
      // Step 1: Query all users
      const usersQuery = query(collection(db, "users"));
      const usersSnap = await getDocs(usersQuery);
      console.log("societyname in user wing update", societyname);
      console.log("wingname in user wing update", wingname);

      if (usersSnap.empty) {
        console.log("No users found in the database.");
        return;
      }

      // Step 2: Iterate through each user and update their data
      const batch = writeBatch(db); // Use a batch to optimize multiple updates

      usersSnap.forEach((userDoc) => {
        const userData = userDoc.data();
        const mySociety = userData.mySociety || [];

        const societyIndex = mySociety.findIndex(
          (society: any) => Object.keys(society)[0] === societyname
        );

        if (societyIndex !== -1) {
          const societyData = mySociety[societyIndex][societyname];

          if (societyData?.myWing?.[wingname]) {
            // Remove the specified wing
            const updatedMyWing = { ...societyData.myWing };
            delete updatedMyWing[wingname];

            const updatedSocietyData = {
              ...societyData,
              myWing: updatedMyWing,
            };

            const updatedMySociety = [...mySociety];
            updatedMySociety[societyIndex] = {
              [societyname]: updatedSocietyData,
            };

            // Add the update to the batch
            batch.update(doc(db, "users", userDoc.id), {
              mySociety: updatedMySociety,
            });

            console.log(`Wing "${wingname}" removed for user "${userDoc.id}".`);
          }
        }
      });

      // Commit the batch
      await batch.commit();
      console.log(`Wing "${wingname}" removed successfully for all users.`);
    } catch (error) {
      console.error("Error updating user data:", error);
    }
  };

  const handleNext = async () => {
    if (totalFloors && unitsPerFloor && selectedFormat !== null) {
      try {
        setLoading(true);

        const docRef = doc(db, "Societies", societyName as string);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          alert("Society does not exist!");
          return;
        }

        const wingRef = doc(
          docRef,
          customWingsSubcollectionName,
          wingLetter as string
        );
        const floorsRef = collection(wingRef, customFloorsSubcollectionName);
        const floorsSnap = await getDocs(floorsRef);

        if (!floorsSnap.empty) {
          console.log(
            `Floors collection exists. Proceeding with Step 1 and Step 2...`
          );

          // Step 1: Call userWingUpdate before deleting old floors and flats
          await userWingUpdate(societyName as string, wingLetter as string);

          // Step 2: Delete old floors and flats in the wing
          for (const floorDoc of floorsSnap.docs) {
            const flatsRef = collection(
              floorsRef,
              floorDoc.id,
              customFlatsSubcollectionName
            );
            const flatsSnap = await getDocs(flatsRef);

            // Delete all flats under the floor
            for (const flatDoc of flatsSnap.docs) {
              const billsRef = collection(
                flatsRef,
                flatDoc.id,
                customFlatsBillsSubcollectionName
              );
              const billsSnap = await getDocs(billsRef);

              // Delete all bills under the flat
              for (const billDoc of billsSnap.docs) {
                await deleteDoc(doc(billsRef, billDoc.id));
              }

              await deleteDoc(doc(flatsRef, flatDoc.id)); // Delete flat document
            }

            await deleteDoc(doc(floorsRef, floorDoc.id)); // Delete floor document
          }
        } else {
          console.log(
            "Floors collection does not exist. Skipping Step 1 and Step 2."
          );
        }

        // Step 3: Generate floor numbers and save new data
        const floorWiseNumbers = generateFloorWiseNumbers();
        if (!floorWiseNumbers) return;

        const wingData = {
          totalFloors: parseInt(totalFloors),
          unitsPerFloor: parseInt(unitsPerFloor),
          format: numberFormats[selectedFormat].type,
        };

        // Update the wing data
        await setDoc(wingRef, wingData, { merge: true });

        // Add new floors and flats
        for (const floorName in floorWiseNumbers) {
          const floorRef = doc(
            wingRef,
            customFloorsSubcollectionName,
            floorName
          );
          await setDoc(floorRef, {
            floorNumber: parseInt(floorName.replace("Floor ", "")),
          });

          const flatsRef = collection(floorRef, customFlatsSubcollectionName);
          floorWiseNumbers[floorName].forEach(async (flatNumber) => {
            const flatRef = doc(flatsRef, flatNumber);

            // Construct the flat reference string
            const flatReference = `${Wing}-${floorName}-${flatNumber}`;

            await setDoc(flatRef, {
              resident: "owner",
              flatType: "owner",
              flatreference: flatReference,
              memberStatus: "Notregistered",
              ownerRegisterd: "Notregistered",
            });
          });
        }

        alert(`Data for Wing ${Wing} saved successfully!`);

        router.push({
          pathname: "/setupsociety/WingSetupScreen",
          params: { Wing: wingLetter, societyName },
        });
      } catch (error) {
        console.error("Error saving data:", error);
        alert("Failed to save data. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      alert("Please fill all fields and select a format!");
    }
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
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content title={Wing as string} titleStyle={styles.titleStyle} />
      </Appbar.Header>
      <ScrollView>
        <View style={{ padding: 16 }}>
          <Text style={styles.heading}>{Wing}</Text>

          <Text style={styles.label}>Name</Text>

          <TextInput
            value={Wing as string}
            editable={false}
            style={styles.input}
          />

          {/* Total Floor*/}
          <View style={styles.customInputContainer}>
            <CustomInput
              label="Total Floor"
              value={totalFloors}
              onChangeText={setTotalFloors}
              keyboardType="numeric"
            />
          </View>

          {/* Maximum Unit Per Floor*/}
          <View style={styles.customInputContainer}>
            <CustomInput
              label="Maximum Unit Per Floor"
              value={unitsPerFloor}
              onChangeText={setUnitsPerFloor}
              keyboardType="numeric"
            />
          </View>
          <Text style={styles.subheading}>Choose Number Format</Text>
        </View>

        <FlatList
          data={numberFormats}
          numColumns={2}
          keyExtractor={(_, index) => index.toString()}
          scrollEnabled={false} // Disables scrolling
          renderItem={({ item, index }) => {
            const isLastOddItem =
              numberFormats.length % 2 !== 0 &&
              index === numberFormats.length - 1;

            // Extract numbers by splitting the label string
            const numbers = item.label.split(",").map((num) => num.trim());

            return (
              <TouchableOpacity
                style={[
                  styles.formatCard,
                  selectedFormat === index && styles.selectedFormatCard,
                  { flexBasis: "45%" }, // Ensure each item takes up nearly half width
                  isLastOddItem ? { alignSelf: "flex-start" } : {}, // Align last item to the left if odd
                ]}
                onPress={() => setSelectedFormat(index)}
              >
                <Text style={styles.unitText}>{item.type}</Text>

                {/* Grid to display numbers */}
                <FlatList
                  data={numbers}
                  keyExtractor={(num, idx) => `${index}-${idx}`}
                  numColumns={3} // Adjust column count as needed
                  renderItem={({ item }) => (
                    <View style={styles.numberBox}>
                      <Text style={styles.numberText}>{item}</Text>
                    </View>
                  )}
                  contentContainerStyle={styles.gridContainer}
                />
              </TouchableOpacity>
            );
          }}
        />
        <View style={{ minHeight: 50 }}></View>
      </ScrollView>
      {/* Save Button */}
      <View style={styles.fixedButtonContainer}>
      <CustomButton
        onPress={() => {
          handleNext();
        }}
        title={"Next"}
        style={{ backgroundColor: "#6200ee" }}
      />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: { backgroundColor: "#6200ee" },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  scrollContainer: { padding: 16 },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: "#fff",
    // width: '100%', // Ensure it takes the full width of its parent
  },
  subheading: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  formatCard: {
    margin: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  selectedFormatCard: {
    borderColor: "#6200ee",
    backgroundColor: "#e7e4f9",
  },
  unitText: {
    fontSize: 14,
    fontWeight: "500",
  },
  nextButton: {
    marginTop: 16,
  },
  customInputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    marginBottom: 5,
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
  },
  gridContainer: {
    alignItems: "center",
  },
  numberBox: {
    minWidth: 50,
    margin: 6,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  numberText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  fixedButtonContainer: {
  position: "absolute",
  bottom: 40,
  left: 0,
  right: 0,
  padding: 16,
  backgroundColor: "#fff", // ensures button is visible on top of list
  borderTopWidth: 1,
  borderTopColor: "#ddd",
  
},
});

export default WingScreen;
