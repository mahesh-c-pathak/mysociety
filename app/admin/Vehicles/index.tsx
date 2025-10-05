import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Card, Chip, IconButton, FAB, Avatar } from "react-native-paper";
import { db } from "@/firebaseConfig";
import {
  collection,
  collectionGroup,
  getDocs,
  query,
} from "firebase/firestore";
import { useSociety } from "@/utils/SocietyContext";

import AppHeader from "@/components/AppHeader"; // Updated import
import LoadingIndicator from "@/components/LoadingIndicator"; // new import
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Vehicle = {
  id: string;
  type?: string;
  parkingAllotment?: string;
  note?: string;
  image?: { selectedImageUrl: string };
  ownerName?: string;
  [key: string]: any;
};

type FlatData = {
  flatNumber: string;
  floorName: string;
  wing: string;
  ownerName: string;
  vehicles: Vehicle[];
};

const Index = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { societyName } = useSociety();

  const vehiclesCollectionName = `vehicles_${societyName}`;
  const customWingsSubcollectionName = `${societyName} wings`;

  const [vehiclesData, setVehiclesData] = useState<Vehicle[]>([]);
  const [wingNames, setWingNames] = useState<string[]>([]);
  const [selectedButton, setSelectedButton] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch wing names from Firestore
  const fetchWings = async () => {
    try {
      setLoading(true);
      const wingsRef = collection(
        db,
        "Societies",
        societyName,
        customWingsSubcollectionName
      );
      const wingsSnapshot = await getDocs(wingsRef);
      const wingList: string[] = [];
      wingsSnapshot.forEach((doc) => wingList.push(doc.id));
      setWingNames(wingList);
      if (wingList.length > 0 && !selectedButton)
        setSelectedButton(wingList[0]); // Default selected wing
    } catch (error) {
      console.error("Error fetching wings:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all vehicles
  const fetchAllVehicles = async () => {
    try {
      setLoading(true);
      const vehiclesQuery = query(collectionGroup(db, vehiclesCollectionName));
      const vehiclesSnapshot = await getDocs(vehiclesQuery);

      const allVehicles: Vehicle[] = vehiclesSnapshot.docs.map((doc) => {
        const pathSegments = doc.ref.path.split("/");
        return {
          id: doc.id,
          wing: pathSegments[3],
          floorName: pathSegments[5],
          flatNumber: pathSegments[7],
          ownerName: doc.data().ownerName || "Unknown",
          ...doc.data(),
        } as Vehicle;
      });

      setVehiclesData(allVehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWings();
    fetchAllVehicles();
  }, []);

  // Group vehicles by flat
  const getFlatListData = (): FlatData[] => {
    const grouped = vehiclesData.reduce<Record<string, FlatData>>(
      (acc, vehicle) => {
        const key = `${vehicle.flatNumber}-${vehicle.floorName}`;
        if (!acc[key]) {
          acc[key] = {
            flatNumber: vehicle.flatNumber,
            floorName: vehicle.floorName,
            wing: vehicle.wing,
            ownerName: vehicle.ownerName || "Unknown",
            vehicles: [],
          };
        }
        acc[key].vehicles.push(vehicle);
        return acc;
      },
      {}
    );
    return Object.values(grouped);
  };

  const handlePressFlat = (flat: FlatData) => {
    router.push({
      pathname: "/admin/Vehicles/VehicleDetails",
      params: {
        source: "Admin",
        societyName,
        wing: flat.wing,
        floorName: flat.floorName,
        flatNumber: flat.flatNumber,
      },
    });
  };

  const renderVehicle = ({ item }: { item: FlatData }) => (
    <Pressable onPress={() => handlePressFlat(item)}>
      <Card style={styles.card} mode="elevated">
        <Card.Title
          title={item.ownerName}
          subtitle={`Flat: ${item.flatNumber}`}
          left={(props) => (
            <Avatar.Text
              {...props}
              label={item.ownerName.charAt(0)}
              style={styles.avatar}
            />
          )}
          right={(props) => (
            <IconButton {...props} icon="phone" onPress={() => {}} />
          )}
        />
        <Card.Content>
          <ScrollView
            horizontal
            contentContainerStyle={styles.vehicleContainer}
          >
            {item.vehicles.map((vehicle) => (
              <Chip key={vehicle.id} icon="car" style={styles.vehicleChip}>
                <View style={styles.vehicleChipContent}>
                  <Text style={styles.vehicleNumber}>{vehicle.id}</Text>
                  {vehicle.parkingAllotment && (
                    <Text style={styles.parkingInfo}>
                      P - {vehicle.parkingAllotment}
                    </Text>
                  )}
                  {vehicle.note && (
                    <Text style={styles.vehicleNote}>{vehicle.note}</Text>
                  )}
                </View>
              </Chip>
            ))}
          </ScrollView>
        </Card.Content>
      </Card>
    </Pressable>
  );

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      {/* AppHeader */}
      <AppHeader
        title="Vehicles"
        source="Admin"
        onBackPress={() => router.back()}
      />

      {/* Wing Buttons */}
      <View style={styles.buttonsContainer}>
        {wingNames.map((wing) => (
          <TouchableOpacity
            key={wing}
            style={[
              styles.button,
              selectedButton === wing && styles.buttonSelected,
            ]}
            onPress={() => setSelectedButton(wing)}
          >
            <Text
              style={[
                styles.buttonText,
                selectedButton === wing && styles.buttonTextSelected,
              ]}
            >
              {wing}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Vehicle List filtered by selected wing */}
      {getFlatListData().filter((flat) => flat.wing === selectedButton).length >
      0 ? (
        <FlatList
          data={getFlatListData().filter(
            (flat) => flat.wing === selectedButton
          )}
          keyExtractor={(item) => `${item.flatNumber}-${item.floorName}`}
          renderItem={renderVehicle}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.noVehiclesContainer}>
          <Text style={styles.noVehiclesText}>No Vehicles</Text>
        </View>
      )}

      {/* FAB */}
      <FAB
        icon="plus"
        color="white"
        style={[styles.fab, { bottom: insets.bottom }]}
        onPress={() => {
          router.push({
            pathname: "/admin/Vehicles/AddVehicleAdmin",
            params: {
              societyName,
              wing: selectedButton, // Pass selected wing
            },
          });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 16,
  },
  button: {
    borderWidth: 1,
    borderColor: "#6200ee",
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginHorizontal: 5,
  },
  buttonSelected: { backgroundColor: "#6200ee" },
  buttonText: { fontSize: 16, color: "#6200ee", textAlign: "center" },
  buttonTextSelected: { color: "#fff" },
  listContainer: { padding: 16 },
  card: { marginBottom: 16 },
  avatar: { backgroundColor: "#6200ee" },
  vehicleContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  vehicleChip: {
    backgroundColor: "#e3f2fd",
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  vehicleChipContent: { flexDirection: "column", alignItems: "center" },
  vehicleNumber: { fontSize: 14, fontWeight: "bold", textAlign: "center" },
  parkingInfo: { fontSize: 12, color: "#0288d1", textAlign: "center" },
  vehicleNote: { fontSize: 12, color: "#555", textAlign: "center" },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#6200ee",
  },
  noVehiclesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  noVehiclesText: {
    fontSize: 18,
    color: "#555",
    fontWeight: "bold",
  },
});

export default Index;
