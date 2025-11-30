import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
} from "react-native";
import React, { useEffect, useState } from "react";
import { FAB, Divider } from "react-native-paper";
import { useRouter } from "expo-router";
import { db } from "@/firebaseConfig";
import { collection, doc, getDocs } from "firebase/firestore";
import { useSociety } from "@/utils/SocietyContext";
import LoadingIndicator from "@/components/LoadingIndicator"; // new import
import { useSafeAreaInsets } from "react-native-safe-area-context";

const OpenTasksAdmin = () => {
  const router = useRouter();
  const { societyName } = useSociety();
  const insets = useSafeAreaInsets();

  const customTasksCollectionName = `Tasks_${societyName}`;

  const [tasksData, setTasksData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        // Construct Firestore references
        const societyRef = `Societies/${societyName}`;
        const societyDocRef = doc(db, societyRef);
        const tasksCollectionRef = collection(
          societyDocRef,
          customTasksCollectionName
        );
        // Fetch the staff
        const tasksSnapshot = await getDocs(tasksCollectionRef);

        // Extract data
        const allTasks = tasksSnapshot.docs.map((doc) => {
          const docPath = doc.ref.path;
          return {
            id: doc.id,
            taskDocPath: docPath,
            ...doc.data(),
          };
        });

        // Set state with staff data
        setTasksData(allTasks);
      } catch (error) {
        console.error("Error fetching admin staff data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [customTasksCollectionName, societyName]);

  const renderTask = ({ item }: { item: any }) => {
    // flatten assigned staff, gatekeepers, and members
    const assignedNames = [
      ...(item.assigned?.staff?.map((s: any) => s.label) || []),
      ...(item.assigned?.gatekeepers?.map((g: any) => g.label) || []),
      ...(item.assigned?.members?.map((m: any) =>
        m.floor ? `${m.floor} - ${m.label}` : m.label
      ) || []),
    ].join(", ");

    return (
      <View style={styles.cardview}>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/admin/TasksAdmin/TaskDetailsAdmin",
              params: {
                item: JSON.stringify(item),
              }, // Pass item as a string
            })
          }
        >
          <Text style={{ fontWeight: "bold" }}>{item.taskName}</Text>
          <View style={[styles.row, { alignItems: "flex-start" }]}>
            <View>
              <Text>Created By: {item.createdBy}</Text>
              <Text>Priority : {item.priority}</Text>
              <Text>Type : {item.taskCategory}</Text>
            </View>
            <View style={{ backgroundColor: "#2196F3", padding: 6 }}>
              <Text style={{ color: "#fff" }}>{item.status}</Text>
            </View>
          </View>

          <Divider style={{ backgroundColor: "#ccc", marginVertical: 8 }} />

          {/* ✅ Show Assigned People */}
          {assignedNames.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight: "bold" }}>
                Assigned:{" "}
                <Text style={{ fontWeight: "normal" }}>{assignedNames}</Text>
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <View style={styles.innerButton}>
              <Text style={styles.dateText}>Start Date : {item.fromDate}</Text>
            </View>

            <View style={styles.innerButton}>
              <Text style={styles.dateText}>End Date : {item.toDate}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tasksData.filter(
          (task) => task.status === "Open" || task.status === "In Progress"
        )}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        ListEmptyComponent={
          <Text style={styles.emptyMessage}>No Task Found</Text>
        }
      />
      {/* Floating Action Button */}
      <FAB
        style={[styles.fab, { bottom: insets.bottom }]}
        icon="plus"
        color="white" // Set the icon color to white
        onPress={() => {
          router.push("/admin/TasksAdmin/addTaskAdmin");
        }}
      />
    </View>
  );
};

export default OpenTasksAdmin;

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
    flex: 1, // ✅ makes both equal width
    borderWidth: 2,
    borderColor: "green",
    paddingVertical: 4,
    marginHorizontal: 4, // ✅ adds spacing between them
    alignItems: "center", // ✅ center text inside
  },
  dateText: {
    color: "green",
  },
});
