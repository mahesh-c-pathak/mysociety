import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Appbar, TextInput } from "react-native-paper";
import { collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";
import { generateTransactionId } from "@/utils/generateTransactionId";
import Dropdown from "@/utils/DropDown";
import PaymentDatePicker from "@/utils/paymentDate";
import ActionModal from "@/components/ActionModal";
import { pickImage, captureImage, uploadViaApi } from "@/utils/imagekitUtils";
import { sendInAppMessage } from "@/utils/sendInAppMessage";
import { fetchAdminIds } from "@/utils/fetchAdminIds";
import { useAuthRole } from "@/lib/authRole";

const PaymentModeScreen = () => {
  const { userName } = useAuthRole();
  const societyContext = useSociety();
  // Determine which context to use based on source
  const societyName = societyContext.societyName;
  const wing = societyContext.wing;
  const flatNumber = societyContext.flatNumber;
  const floorName = societyContext.floorName;

  const customWingsSubcollectionName = `${societyName} wings`;
  const customFloorsSubcollectionName = `${societyName} floors`;
  const customFlatsSubcollectionName = `${societyName} flats`;
  // const customFlatsBillsSubcollectionName = `${societyName} bills`;
  const customFlatsBillsSubcollectionName = "flatbills";

  const unclearedBalanceSubcollectionName = "unclearedBalances";

  // const unclearedBalanceSubcollectionName = `unclearedBalances_${societyName}`;
  const [loading, setLoading] = useState(false);

  const { paymentmode, amount, selectedIds, selectedBills } =
    useLocalSearchParams();

  // alias to camelCase for convenience
  const paymentMode = paymentmode as string;

  // const parsedSelectedIds = JSON.parse(selectedIds as string);
  let parsedSelectedIds: any[] = [];
  try {
    parsedSelectedIds =
      selectedIds && selectedIds !== "undefined"
        ? JSON.parse(selectedIds as string)
        : [];
  } catch (err) {
    console.warn("Invalid selectedIds JSON:", selectedIds);
    console.log("err", err);
    parsedSelectedIds = [];
  }

  const router = useRouter();
  // const [balancesheet, setBalancesheet] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const paymentMethods = ["Google Pay", "Phone pe", "UPI", "Other"];
  const [modalVisible, setModalVisible] = useState(false);

  // Function to format date as "YYYY-MM-DD"
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  // State for Payment Date
  const [paymentDate, setPaymentDate] = useState<Date | null>(null);
  const [formattedDate, setFormattedDate] = useState(formatDate(new Date()));

  // State for Cheque Inputs
  const [bankName, setBankName] = useState("");
  const [chequeNo, setChequeNo] = useState("");

  const handleCustomDateChange = (selectedDate: Date) => {
    setPaymentDate(selectedDate);
    setFormattedDate(formatDate(selectedDate));
  };

  // Image add

  const [image, setImage] = useState<string | null>(null);
  const folderName = "/expo-test-uploads-private/";

  const handlePickImage = async () => {
    const uri = await pickImage();
    if (uri) {
      setImage(uri);
      console.log("Image picked: ", uri);
    }
  };

  const handleCaptureImage = async () => {
    const uri = await captureImage();
    if (uri) {
      setImage(uri);
      console.log("Image captured: ", uri);
    }
  };

  // Handle save

  const handleSave = async () => {
    try {
      if (!image) {
        Alert.alert(
          "Missing Image",
          "Please select or capture an image before saving."
        );
        return;
      }

      setLoading(true); // 🔵 start loader

      let uploadedFilePath: string | null = null;

      try {
        const { filePath } = await uploadViaApi(image, paymentMode, folderName);
        uploadedFilePath = filePath;
        console.log("Uploaded file path:", filePath);
      } catch (uploadErr: any) {
        console.error("Image upload failed:", uploadErr.message);
        Alert.alert(
          "Upload Failed",
          "Could not upload image. Please try again."
        );
        setLoading(false); // 🔴 stop loader on error
        return;
      }

      // Firestore references
      const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
      const flatDocRef = doc(db, flatRef);
      const unclearedBalanceRef = collection(
        flatDocRef,
        unclearedBalanceSubcollectionName
      );
      let transactionId = generateTransactionId();

      // Define document fields
      const docData = {
        societyName: societyName,
        status: "Uncleared",
        amount: parseFloat(amount as string),
        amountPaid: parseFloat(amount as string),
        paymentDate: formattedDate,
        paymentMode: paymentMode || "Other",
        bankName: bankName || null,
        chequeNo: chequeNo || null,
        transactionId,
        selectedIds: selectedIds ? JSON.parse(selectedIds as string) : [],
        selectedBills: selectedBills ? JSON.parse(selectedBills as string) : [],
        paymentMethod: paymentMethod,
        privateFilePath: uploadedFilePath || null, // ✅ null if no image
      };

      // Keep generating a new transactionId if it already exists
      let docRef = doc(unclearedBalanceRef, transactionId);
      let docSnap = await getDoc(docRef);

      while (docSnap.exists()) {
        transactionId = generateTransactionId(); // Generate a new ID
        docRef = doc(unclearedBalanceRef, transactionId); // Update docRef
        docSnap = await getDoc(docRef); // Check again
      }

      // Set the document once we have a unique transactionId
      await setDoc(docRef, docData);
      console.log("Uncleared Balance Document created successfully.");

      const flatBillRef = collection(
        flatDocRef,
        customFlatsBillsSubcollectionName
      );

      for (const billId of parsedSelectedIds) {
        const billDocRef = doc(flatBillRef, billId);
        await updateDoc(billDocRef, { status: "Pending Approval" });
        console.log(`Updated bill ${billId} to Pending Approval`);
      }

      // 🔹 Send in-app message to all admins only
      const adminIds = await fetchAdminIds(societyName as string);

      const title = `Add Money`;
      const body = `${wing} ${flatNumber} ${userName} | Receipt `;

      await Promise.all(
        adminIds.map((adminId) =>
          sendInAppMessage(
            societyName as string,
            adminId,
            title,
            body,
            "Receipt",
            `/admin/Collection` // 🔹 optional path
          )
        )
      );

      Alert.alert(
        "Cash",
        "Your Payment request has been successfully submitted to Admin. You will get a notification after verification."
      );

      router.replace("/member/myBill");
    } catch (error) {
      console.error("Error saving uncleared balance:", error);
      Alert.alert("Error", "Failed to save payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Appbar */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={paymentMode} />
      </Appbar.Header>

      {/* Payment Date Input */}
      <View style={styles.formContainer}>
        <Text style={styles.label}>Payment Date</Text>
        <PaymentDatePicker
          initialDate={paymentDate}
          onDateChange={handleCustomDateChange}
          placeholder="YYYY-MM-DD"
        />

        {/* Conditional UI based on Payment Mode */}
        {paymentMode === "Upload Transaction Receipt" && (
          <>
            <Text style={styles.label}>Payment Method</Text>
            {/* Dropdown for Balancesheet */}

            <Dropdown
              data={paymentMethods.map((option) => ({
                label: option,
                value: option,
              }))}
              onChange={(selectedValue) => {
                setPaymentMethod(selectedValue);
              }}
              placeholder="Select "
              initialValue={paymentMethod}
            />
          </>
        )}

        {paymentMode === "Cheque" && (
          <>
            <Text style={styles.label}>Bank Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Bank Name"
              value={bankName}
              onChangeText={setBankName}
            />

            <Text style={styles.label}>Cheque No.</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Cheque Number"
              keyboardType="numeric"
              value={chequeNo}
              onChangeText={setChequeNo}
            />
          </>
        )}

        {/* Choose Image Button */}

        <TouchableOpacity
          style={styles.button}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.buttonText}>Choose Image</Text>
        </TouchableOpacity>

        {/* Reusable ActionModal */}
        <ActionModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          actions={[
            {
              label: "Capture Image from Camera",
              onPress: () => {
                handleCaptureImage();
                setModalVisible(false);
              },
            },
            {
              label: "Pick an Image from Gallery",
              onPress: () => {
                handlePickImage();
                setModalVisible(false);
              },
              color: "#4CAF50",
            },
          ]}
        />

        {image && (
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="contain" // ✅ shows full image without clipping
          />
        )}

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { backgroundColor: "#2196F3" },
  formContainer: { flex: 1, padding: 16 },
  label: { fontSize: 16, marginBottom: 8 },
  input: {
    borderColor: "#ccc",
    padding: 8,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#fff", // Match container background
    borderWidth: 0, // Remove border
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
    marginTop: 16,
  },
  buttonText: { color: "#fff", fontSize: 16 },
  saveButton: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontSize: 16 },
  image: {
    width: 200,
    height: 200,
    marginVertical: 10,
    alignSelf: "center", // ✅ centers horizontally
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default PaymentModeScreen;
