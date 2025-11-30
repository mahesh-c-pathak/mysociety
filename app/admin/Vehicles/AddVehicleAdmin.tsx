// screens/NewVisitor.tsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";
import AppbarComponent from "@/components/AppbarComponent";
import { collectionGroup, getDocs } from "firebase/firestore";
import WingsFlatsGrid from "@/components/WingsFlatsGrid";

type FlatData = {
  flatType: string;
  resident: string;
  memberStatus: string;
  ownerRegisterd?: string;
  renterRegisterd?: string;
};
type FlatsData = Record<string, Record<string, Record<string, FlatData>>>;

const AddVehicleAdmin = () => {
  const router = useRouter();
  const { societyName } = useSociety();
  const customFlatsSubcollectionName = `${societyName} flats`;

  const [flatsData, setFlatsData] = useState<FlatsData>({});

  const fetchFlatsData = async () => {
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
        data[wing][floor][flatId] = flatData;
      });
      setFlatsData(data);
    } catch (error) {
      console.error("Error fetching flats data:", error);
    }
  };

  useEffect(() => {
    fetchFlatsData();
  }, []);

  const handleFlatPress = (
    flatId: string,
    flatType: string,
    floor: string,
    wing: string
  ) => {
    router.push({
      pathname: "/admin/Vehicles/AddVechileDetails",
      params: { wing, floorName: floor, flatNumber: flatId, flatType },
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppbarComponent title="Select Member" source="Admin" />
      <WingsFlatsGrid flatsData={flatsData} onFlatPress={handleFlatPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
});

export default AddVehicleAdmin;
