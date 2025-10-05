import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, Button, Modal, Portal } from "react-native-paper";
import { useNotification } from "@/context/NotificationContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";


export default function VisitorApprovalModal() {
  const { pendingVisitor, setPendingVisitor } = useNotification();
 
  

  if (!pendingVisitor) return null;

  const handleAction = async (status: "Approved" | "Rejected") => {
    try {
      const { wing, floorName, flatNumber, visitorId, societyName } = pendingVisitor;
      const customWingsSubcollectionName = `${societyName} wings`;
      const customFloorsSubcollectionName = `${societyName} floors`;
      const customFlatsSubcollectionName = `${societyName} flats`;
      const customVisitorCollectionName = `visitor_${societyName}`;
      const visitorRef = doc(
        db,
        `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}/${customVisitorCollectionName}/${visitorId}`
      );
      await updateDoc(visitorRef, { visitorStatus: status });
    } catch (err) {
      console.error("Error updating visitor:", err);
    }
    setPendingVisitor(null);
  };

  return (
    <Portal>
      <Modal visible onDismiss={() => setPendingVisitor(null)} contentContainerStyle={styles.modalBox}>
        <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 20 }}>
           Approve visitor for ?
        </Text>
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={() => handleAction("Rejected")}
            buttonColor="red"
            style={{ flex: 1, marginRight: 5 }}
          >
            Deny
          </Button>
          <Button
            mode="contained"
            onPress={() => handleAction("Approved")}
            buttonColor="green"
            style={{ flex: 1, marginLeft: 5 }}
          >
            Allow
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalBox: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    margin: 20,
  },
  actions: {
    flexDirection: "row",
    marginTop: 10,
  },
});
