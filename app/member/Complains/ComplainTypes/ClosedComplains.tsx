import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Divider } from "react-native-paper";
import { useRouter } from "expo-router";
import { db } from "@/firebaseConfig";
import { collectionGroup, getDocs, query, where } from "firebase/firestore";
import { useSociety } from "@/utils/SocietyContext";

const ClosedComplains = () => {
  const router = useRouter();
  const { societyName, wing, flatNumber } = useSociety();

  const customComplainSubcollectionName = `${societyName} complains`;

  const [complainData, setComplainData] = useState<any[]>([]);
  const fetchComplainData = async () => {
    try {
      // Query 1: classification = "Public"
      const publicQuery = query(
        collectionGroup(db, customComplainSubcollectionName),
        where("classification", "==", "Public"),
        where("status", "!=", "Open") // Ensuring status is Open
      );

      // Query 2: createdBy = "A 101"
      const createdByQuery = query(
        collectionGroup(db, customComplainSubcollectionName),
        where("createdBy", "==", `${wing} ${flatNumber}`),
        where("status", "!=", "Open") // Ensuring status is Open
      );

      // Fetch both queries
      const [publicSnapshot, createdBySnapshot] = await Promise.all([
        getDocs(publicQuery),
        getDocs(createdByQuery),
      ]);

      // Extract data
      const publicComplaints = publicSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const createdByComplaints = createdBySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Merge results and remove duplicates (in case any overlap exists)
      const mergedComplaints = [
        ...publicComplaints,
        ...createdByComplaints.filter(
          (complaint) => !publicComplaints.some((c) => c.id === complaint.id)
        ),
      ];

      // console.log("Complaints:", mergedComplaints);
      setComplainData(mergedComplaints);
    } catch (error) {
      console.error("Error fetching complaints:", error);
    }
  };

  useEffect(() => {
    fetchComplainData();
  }, []);

  const renderComplain = ({ item }: { item: any }) => (
    <View style={styles.cardview}>
      <TouchableOpacity>
        <Text style={{ fontWeight: "bold" }}>{item.complainName}</Text>
        <View style={styles.row}>
          <Text>Complained By: {item.createdBy}</Text>
          <Text>{item.createdDate}</Text>
        </View>
        <View style={styles.row}>
          <Text>Priority : {item.priority}</Text>
          <Text>{item.classification}</Text>
        </View>
        <View style={[styles.row, { alignItems: "flex-start" }]}>
          <Text>Type : {item.complainCategory}</Text>
          <View style={{ backgroundColor: "#2196F3", padding: 6 }}>
            <Text style={{ color: "#fff" }}>{item.status}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <Divider style={{ backgroundColor: "#ccc", marginVertical: 8 }} />
      <View style={styles.row}>
        <TouchableOpacity>
          <View style={styles.innerButton}>
            <Text>Assign</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "../complainDetails",
              params: {
                item: JSON.stringify(item),
              }, // Pass item as a string
            })
          }
        >
          <View style={styles.innerButton}>
            <Text>Message</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={complainData}
        renderItem={renderComplain}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyMessage}>No Complain Found</Text>
        }
      />
    </View>
  );
};

export default ClosedComplains;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#2196F3", // Customize the color
  },
  cardview: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    elevation: 4, // For shadow on Android
    shadowColor: "#000", // For shadow on iOS
    shadowOffset: { width: 0, height: 2 }, // For shadow on iOS
    shadowOpacity: 0.1, // For shadow on iOS
    shadowRadius: 4, // For shadow on iOS
    borderWidth: 1, // Optional for outline
    borderColor: "#e0e0e0", // Optional for outline
  },
  list: {
    padding: 10,
  },
  emptyMessage: {
    textAlign: "center",
    fontSize: 16,
    color: "#888",
    marginVertical: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  innerButton: {
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 4,
  },
});
