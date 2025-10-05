import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { db } from "@/firebaseConfig";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { useSociety } from "@/utils/SocietyContext";
import { Card, IconButton } from "react-native-paper";
import AppHeader from "@/components/AppHeader";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFileDetailsFromUrl, deleteFileViaApi } from "@/utils/imagekitUtils";

type Vehicle = {
  id: string;
  type?: string;
  parkingAllotment?: string;
  note?: string;
  image?: string;
  [key: string]: any;
};

const VehicleDetails = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wing, floorName, flatNumber } = useLocalSearchParams();
  const { societyName } = useSociety();

  const vehiclesCollectionName = `vehicles_${societyName}`;
  // const customStaffCollectionName = `staff_${societyName}`;
  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;

      const vehiclesRef = collection(doc(db, flatRef), vehiclesCollectionName);
      const vehiclesSnapshot = await getDocs(vehiclesRef);

      const list: Vehicle[] = vehiclesSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Vehicle[];

      setVehicles(list);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleEditVehicle = (vehicle: Vehicle) => {
    router.push({
      pathname: "/admin/Vehicles/AddVechileDetails",
      params: {
        wing,
        floorName,
        flatNumber,
        flatType: "", // optional, if you want to pass
        source: "Admin",
        vehicleNumber: vehicle.id, // vehicleNumber as param to edit
      },
    });
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    Alert.alert(
      "Delete Vehicle",
      "Are you sure you want to delete this vehicle?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              // 1️⃣ Delete image from ImageKit if exists
              if (vehicle.image) {
                const fileData = await getFileDetailsFromUrl(vehicle.image);
                if (fileData?.fileId) {
                  await deleteFileViaApi(fileData.fileId);
                }
              }

              // 2️⃣ Delete vehicle from Firestore
              const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
              const vehicleDocRef = doc(
                db,
                flatRef,
                vehiclesCollectionName,
                vehicle.id
              );
              await deleteDoc(vehicleDocRef);

              Alert.alert("Success", "Vehicle deleted successfully");
              fetchVehicles();
            } catch (err: any) {
              console.error("Error deleting vehicle:", err);
              Alert.alert("Error", err.message || "Failed to delete vehicle");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingIndicator />;

  return (
    <View style={styles.container}>
      <AppHeader
        title={`Vehicles - ${flatNumber}`}
        source="Admin"
        onBackPress={() => router.back()}
      />

      {vehicles.length === 0 ? (
        <View style={styles.noVehiclesContainer}>
          <Text style={styles.noVehiclesText}>No Vehicles</Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: insets.bottom + 100 },
          ]}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="elevated">
              <Card.Title
                title={item.id}
                subtitle={item.type}
                right={(props) => (
                  <View style={{ flexDirection: "row" }}>
                    <IconButton
                      {...props}
                      icon="pencil"
                      onPress={() => handleEditVehicle(item)}
                    />
                    <IconButton
                      {...props}
                      icon="delete"
                      onPress={() => handleDeleteVehicle(item)}
                    />
                  </View>
                )}
              />
              <Card.Content>
                {item.parkingAllotment ? (
                  <Text style={styles.detail}>
                    Parking: {item.parkingAllotment}
                  </Text>
                ) : null}
                {item.note ? (
                  <Text style={styles.detail}>Note: {item.note}</Text>
                ) : null}
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.image} />
                ) : null}
              </Card.Content>
            </Card>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  listContainer: { padding: 16 },
  card: { marginBottom: 16 },
  detail: { fontSize: 14, marginTop: 4 },
  image: { width: 200, height: 200, marginTop: 8, alignSelf: "center" },
  noVehiclesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noVehiclesText: { fontSize: 18, color: "#555", fontWeight: "bold" },
});

export default VehicleDetails;
