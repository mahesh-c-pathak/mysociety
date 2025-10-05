import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";
import { Divider } from "react-native-paper";
import { collectionGroup, getDocs, query, where } from "firebase/firestore";

const ClosedComplainsAdmin = () => {
  const router = useRouter();
  const { societyName } = useSociety();
  const customComplainSubcollectionName = `${societyName} complains`;
  const [complainData, setComplainData] = useState<any[]>([]);
  const fetchComplainData = async () => {
    try {
      // Query: Fetch all complaints where status != "Open"
      const openComplaintsQuery = query(
        collectionGroup(db, customComplainSubcollectionName),
        where("status", "!=", "Open") // Fetch only Open complaints
      );

      // Fetch the complaints
      const openComplaintsSnapshot = await getDocs(openComplaintsQuery);

      // Extract data
      const openComplaints = openComplaintsSnapshot.docs.map((doc) => {
        const docPath = doc.ref.path;
        const pathSegments = docPath.split("/");
        return {
          wing: pathSegments[3],
          floorName: pathSegments[5],
          flatNumber: pathSegments[7],
          id: doc.id,
          complainDocPath: docPath,
          ...doc.data(),
        };
      });

      // Set state with open complaints
      setComplainData(openComplaints);
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
              pathname: "../complainDetailsAdmin",
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

export default ClosedComplainsAdmin;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#6200ee", // Customize the color
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
