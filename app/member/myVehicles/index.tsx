import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Card, Chip, IconButton, FAB, Avatar } from "react-native-paper";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";
import AppHeader from "@/components/AppHeader"; // Updated import
import LoadingIndicator from "@/components/LoadingIndicator"; // new import
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Index = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { source } = useLocalSearchParams();
  const { societyName, wing, floorName, flatNumber } = useSociety();

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [ownerName, setOwnerName] = useState<string>("");

  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFlatVehicles = async () => {
      try {
        setLoading(true);
        const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
        const flatDocRef = doc(db, flatRef);

        // ✅ fetch vehicles from subcollection
        const vehiclesCollectionRef = collection(
          flatDocRef,
          `vehicles_${societyName}`
        );
        const vehicleDocs = await getDocs(vehiclesCollectionRef);

        const vehiclesArray = vehicleDocs.docs.map((docSnap) => ({
          vehicleNumber: docSnap.id,
          ...docSnap.data(),
        }));
        setVehicles(vehiclesArray);

        // ✅ fetch flat owner info separately
        const flatSnap = await getDoc(flatDocRef);
        if (flatSnap.exists()) {
          const flatData = flatSnap.data();
          const userDetailsMap = flatData?.userDetails || {};
          const firstUser = Object.values(userDetailsMap)[0] as any; // get the first user object

          setOwnerName(firstUser?.userName || "No Name");
        } else {
          setOwnerName("No Name");
          console.log("Flat data not found");
        }
      } catch (error) {
        console.error("Error fetching flat vehicles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlatVehicles();
  }, [societyName, wing, floorName, flatNumber]);

  const renderVehicle = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => {
        if (source === "Admin") {
          router.push({
            pathname: "/member/myVehicles",
            params: {
              source: "Admin",
              societyName,
              wing,
              floorName,
              flatNumber,
              vehicleNumber: item.vehicleNumber,
            },
          });
        }
      }}
    >
      <Card style={styles.card} mode="elevated">
        <Card.Title
          title={ownerName}
          subtitle={`Flat: ${flatNumber}`}
          left={(props) => (
            <Avatar.Text
              {...props}
              label={ownerName.charAt(0)}
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
            <Chip
              icon="car"
              style={styles.vehicleChip}
              onPress={() => console.log(item.vehicleNumber)}
            >
              <View style={styles.vehicleChipContent}>
                <Text style={styles.vehicleNumber}>{item.vehicleNumber}</Text>
                {item.parkingAllotment && (
                  <Text
                    style={styles.parkingInfo}
                  >{`P - ${item.parkingAllotment}`}</Text>
                )}
                {item.note && (
                  <Text style={styles.vehicleNote}>{item.note}</Text>
                )}
              </View>
            </Chip>
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
        title="My Vehicles"
        source={source === "Admin" ? "Admin" : "Member"}
        onBackPress={() => router.back()}
      />

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.vehicleNumber}
        renderItem={renderVehicle}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: insets.bottom + 100 },
        ]}
      />

      <FAB
        icon="plus"
        color="white"
        style={[styles.fab, { bottom: insets.bottom }]}
        onPress={() => router.push("/member/myVehicles/AddMyVehicle")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  listContainer: { padding: 16 },
  card: { marginBottom: 16 },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#6200ee",
  },
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
});

export default Index;
