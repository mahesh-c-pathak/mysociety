import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import React, { useState, useEffect } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { useSociety } from "@/utils/SocietyContext";
import { Calendar, DateData } from "react-native-calendars";
import { Modal, Portal, Button } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";

const StaffAttendance = () => {
  const router = useRouter();
  const { staffId } = useLocalSearchParams(); // 👈 get staffId
  const { societyName } = useSociety();

  const [markedDates, setMarkedDates] = useState<any>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const staffCollection = `Societies/${societyName}/staff_${societyName}`;
  const attendanceRef = collection(
    doc(db, staffCollection, staffId as string),
    "attendance"
  );

  // ✅ Load attendance from Firestore
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const snapshot = await getDocs(attendanceRef);
        let dates: any = {};
        snapshot.forEach((docSnap) => {
          const status = docSnap.data().status;
          dates[docSnap.id] = {
            marked: true,
            dotColor: status === "present" ? "green" : "red",
            selected: true,
            selectedColor: status === "present" ? "green" : "red",
          };
        });
        setMarkedDates(dates);
      } catch (err) {
        console.error("Error fetching attendance:", err);
      }
    };
    fetchAttendance();
  }, [attendanceRef, staffId]);

  const showModal = (day: DateData) => {
    const selected = new Date(day.dateString);
    const today = new Date();
    if (selected > today) return; // no future marking
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  const hideModal = () => setModalVisible(false);

  // ✅ Save attendance
  const markAttendance = async (status: "present" | "absent") => {
    if (!selectedDate) return;
    try {
      await setDoc(doc(attendanceRef, selectedDate), {
        status,
        timestamp: new Date(),
      });

      // Update UI immediately
      setMarkedDates((prev: any) => ({
        ...prev,
        [selectedDate]: {
          marked: true,
          dotColor: status === "present" ? "green" : "red",
          selected: true,
          selectedColor: status === "present" ? "green" : "red",
        },
      }));
    } catch (err) {
      console.error("Error marking attendance:", err);
    } finally {
      hideModal();
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppbarComponent title="Staff Attendance" source="Admin" />
      <ScrollView style={styles.scrollContainer}>
        <Calendar
          current={new Date().toISOString().split("T")[0]}
          markedDates={markedDates}
          onDayPress={showModal}
          theme={{
            selectedDayBackgroundColor: "#00adf5",
            todayTextColor: "#00adf5",
            arrowColor: "#00adf5",
          }}
        />
      </ScrollView>
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={hideModal}
          contentContainerStyle={styles.modalContainer}
        >
          <TouchableOpacity style={styles.closeButton} onPress={hideModal}>
            <Ionicons name="close" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Attendance</Text>
          {selectedDate && (
            <Text style={styles.modalText}>
              Mark attendance for {selectedDate}?
            </Text>
          )}
          <View style={styles.modalButtons}>
            <Button
              mode="contained"
              style={styles.yesButton}
              onPress={() => markAttendance("present")}
            >
              Present
            </Button>
            <Button
              mode="contained"
              style={styles.noButton}
              onPress={() => markAttendance("absent")}
            >
              Absent
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

export default StaffAttendance;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContainer: { padding: 20 },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  yesButton: {
    backgroundColor: "green",
    flex: 1,
    marginHorizontal: 5,
  },
  noButton: {
    backgroundColor: "red",
    flex: 1,
    marginHorizontal: 5,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
  },
});
