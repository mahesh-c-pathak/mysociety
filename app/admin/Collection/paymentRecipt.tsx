import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { Button, TextInput } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import Dropdown from "../../../utils/DropDown";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSociety } from "../../../utils/SocietyContext";
import { fetchSignedUrl } from "@/utils/imagekitUtils";
import { sendInAppMessage } from "@/utils/sendInAppMessage";
import AppbarComponent from "@/components/AppbarComponent";
// import LoadingIndicator from "@/components/LoadingIndicator"; // new import

const PaymentRecipt = () => {
  const router = useRouter();
  const { societyName } = useSociety();
  const {
    wing,
    floorName,
    flatNumber,
    amount,
    paymentDate,
    transactionId,
    paymentMode,
    notes,
    selectedIds,
    bankName,
    chequeNo,
    selectedBillsProperties,
    privateFilePath,
    userIds,
  } = useLocalSearchParams();

  // Ensure these are strings
  const formattedWing = String(wing);
  const formattedFloorName = String(floorName);
  const formattedFlatNumber = String(flatNumber);
  const formattedAmount = String(amount);
  const formattedPaymentDate = String(paymentDate);
  const formattedTransactionId = String(transactionId);
  const formattedPaymentMode = String(paymentMode);
  const formattednotes = String(notes);
  const formattedbankName = String(bankName);
  const formattedchequeNo = String(chequeNo);

  const [isModalVisible, setIsModalVisible] = useState(false); // Modal state
  const [reason, setReason] = useState(""); // Reason for rejection
  const [note, setNote] = useState(""); // Optional note
  // Toggle modal visibility
  const toggleModal = () => setIsModalVisible(!isModalVisible);

  const parsedUserIds =
    typeof userIds === "string" ? JSON.parse(userIds) : userIds || [];

  const reasonOptions = [
    { label: "Already Accepted Receipt", value: "Already Accepted Receipt" },
    { label: "Older Receipt", value: "Older Receipt" },
    { label: "Screenshot Not clear", value: "Screenshot Not clear" },
    { label: "Other", value: "Other" },
  ];

  const [reasonFromOptions, setReasonFromOptions] =
    useState<{ label: string; value: string }[]>(reasonOptions);
  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;

  // const unclearedBalanceSubcollectionName = `unclearedBalances_${societyName}`;

  const unclearedBalanceSubcollectionName = "unclearedBalances";

  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(true);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);

  // Fetch signed URL for receipt image
  useEffect(() => {
    const loadImage = async () => {
      try {
        if (privateFilePath) {
          const { url } = await fetchSignedUrl(privateFilePath as string);
          setReceiptUrl(url);
        }
      } catch (err) {
        console.error("Failed to load receipt image:", err);
      } finally {
        setLoadingImage(false);
      }
    };
    loadImage();
  }, [privateFilePath]);

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const [formattedDate, setFormattedDate] = useState<any>(
    formatDate(new Date(paymentDate as string))
  );

  const handleModalReject = async () => {
    try {
      // Check if a reason to reject is selected
      if (!reason) {
        Alert.alert("Error", "Please select a Reason.");
        return;
      }

      // Construct the document reference correctly
      const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
      const unclearedBalanceDocRef = doc(
        db,
        flatRef,
        unclearedBalanceSubcollectionName,
        transactionId as string
      );

      // Data to be updated or created
      const data = {
        status: "Rejected",
        reason: reason || "",
        note: note || "",
      };

      // Update or create the document
      await setDoc(unclearedBalanceDocRef, data, { merge: true });

      // 🔹 Send In-App Message to all users of that flat
      if (parsedUserIds.length > 0) {
        const title = `Receipt for ₹${formattedAmount} Rejected`;
        const body = `Reject Reason ${reason}`;
        console.log("Sending in-app messages to:", parsedUserIds);

        await Promise.all(
          parsedUserIds.map((uid: string) =>
            sendInAppMessage(
              societyName as string,
              uid,
              title,
              body,
              "receipt_rejected",
              `/member/myBill/Wallet` // 🔹 optional path
            )
          )
        );

        console.log("In-app messages sent successfully");
      }

      console.log(`Transaction ${transactionId} updated successfully.`);

      // Alert with OK button. Navigate to FlatCollectionSummary
      Alert.alert("Success", "Payment Request Rejected successfully.", [
        {
          text: "OK",
          onPress: () => {
            router.replace({
              pathname: "/admin/Collection/FlatCollectionSummary",
              params: {
                wing: formattedWing,
                floorName: formattedFloorName,
                flatNumber: formattedFlatNumber,
              },
            });
          },
        },
      ]);

      // Close modal after successful update
      toggleModal();
    } catch (error) {
      console.error("Failed to reject receipt:", error);
      Alert.alert("Error", "Failed to reject receipt. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Appbar Header */}

      <AppbarComponent title="Payment Receipt" source="Admin" />

      {/* Payment Details */}
      <View style={styles.card}>
        <DetailItem label="Flat Number:" value={formattedFlatNumber} />
        <DetailItem label="Transaction Id:" value={formattedTransactionId} />
        <DetailItem label="Payment Date:" value={formattedDate} />
        <DetailItem
          label="Amount:"
          value={`₹ ${parseFloat(formattedAmount).toFixed(2)}`}
        />
        <DetailItem
          label="Payment Method:"
          value={formattedPaymentMode || "N/A"}
        />
        <DetailItem label="Receipt Notes:" value={formattednotes || ""} />
      </View>

      {/* Receipt Image 
      {receiptImage && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: receiptImage }} style={styles.receiptImage} />
        </View>
      )}
        */}

      {/* Receipt Image */}
      <View style={styles.imageContainer}>
        {loadingImage ? (
          <ActivityIndicator size="large" color="#2196F3" />
        ) : receiptUrl ? (
          <TouchableOpacity onPress={() => setIsImageModalVisible(true)}>
            <Image
              source={{ uri: receiptUrl }}
              style={styles.receiptImage}
              resizeMode="contain"
            />
            <Text style={{ color: "#666", marginTop: 5, fontSize: 12 }}>
              Tap to view full screen
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ color: "#999" }}>No receipt uploaded</Text>
        )}
      </View>

      {/* Full-screen Image Modal */}
      {/* Full-screen Image Modal */}
      <Modal
        visible={isImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsImageModalVisible(false)}
      >
        <View style={styles.fullScreenModal}>
          {/* Close button in top-right */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsImageModalVisible(false)}
          >
            <Text style={{ color: "#fff", fontSize: 22 }}>✕</Text>
          </TouchableOpacity>

          {/* Actual image */}
          {receiptUrl && (
            <Image
              source={{ uri: receiptUrl }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          style={styles.acceptButton}
          onPress={() => {
            router.push({
              pathname: "/admin/Collection/AcceptReceipt",
              params: {
                wing: formattedWing,
                floorName: formattedFloorName,
                flatNumber: formattedFlatNumber,
                amount: formattedAmount,
                paymentDate: formattedPaymentDate,
                paymentMode: formattedPaymentMode,
                transactionId: formattedTransactionId,
                selectedIds,
                bankName: formattedbankName,
                chequeNo: formattedchequeNo,
                selectedBillsProperties,
                privateFilePath: privateFilePath,
                userIds,

                // Add other necessary params if available
              },
            });
          }}
        >
          Accept
        </Button>

        <Button
          mode="contained"
          style={styles.rejectButton}
          onPress={toggleModal}
        >
          Reject
        </Button>
      </View>

      {/* Modal */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Receipt</Text>
              <TouchableOpacity onPress={toggleModal}>
                <Text style={{ fontSize: 20, fontWeight: "bold" }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Reason to Reject */}
            <View style={styles.section}>
              <Text style={styles.label}>Reason For</Text>
              <Dropdown
                data={reasonFromOptions}
                onChange={setReason}
                placeholder="Select Reason"
              />
            </View>
            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              mode="outlined"
              placeholder="Enter a note"
              value={note}
              onChangeText={setNote}
              style={[styles.input, styles.noteInput]}
              multiline
            />
            <Button
              mode="contained"
              style={styles.rejectButton}
              onPress={() => {
                handleModalReject();
              }}
            >
              Reject
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { backgroundColor: "#6200ee" },
  card: {
    backgroundColor: "#FFF",
    elevation: 3,
    borderRadius: 8,
    padding: 16,
    marginVertical: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  detailLabel: { fontWeight: "bold", color: "#333" },
  detailValue: { color: "#555" },
  imageContainer: { alignItems: "center", marginVertical: 10 },
  receiptImage: { width: 150, height: 150, borderRadius: 8 },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  acceptButton: { backgroundColor: "#5E35B1" },
  rejectButton: { backgroundColor: "#D32F2F" },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#FFF",
    width: "90%",
    borderRadius: 8,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 4,
    padding: 10,
    marginVertical: 8,
  },
  noteInput: { height: 80, textAlignVertical: "top" },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  dateInput: { flex: 1, borderBottomWidth: 1, paddingVertical: 8 },
  calendarIcon: { fontSize: 20, marginLeft: 8 },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  modalAcceptButton: { backgroundColor: "#4CAF50", marginTop: 10 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  section: {
    marginBottom: 16, // Adds consistent spacing between sections
  },
  fullScreenCloseArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  fullScreenModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    flex: 1, // let it expand dynamically
    width: "100%", // scale properly
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1,
  },
});

export default PaymentRecipt;
