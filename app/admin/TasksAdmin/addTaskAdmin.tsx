import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import Dropdown from "@/utils/DropDown";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { useSociety } from "@/utils/SocietyContext";
import { useAuthRole } from "@/lib/authRole";
import PaymentDatePicker from "@/utils/paymentDate";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  Timestamp,
  getDoc,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import ActionModal from "@/components/ActionModal";
import {
  pickImage,
  captureImage,
  uploadViaApi,
  fetchSignedUrl,
} from "@/utils/imagekitUtils";

import { formatDate } from "@/utils/dateFormatter";

const AddTaskAdmin = () => {
  const { userName } = useAuthRole();
  const { societyName } = useSociety();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const { taskRef: taskRefParam } = useLocalSearchParams();
  const taskRef = taskRefParam as string;
  const isEditMode = !!taskRef;

  const { assignData: assignDataParam } = useLocalSearchParams();
  const [assignData, setAssignData] = useState<any>(null);

  useEffect(() => {
    if (assignDataParam) {
      try {
        setAssignData(JSON.parse(assignDataParam as string));
      } catch (e) {
        console.error("Failed to parse assignData", e);
      }
    }
  }, [assignDataParam]);

  const [taskName, setTaskName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [taskCategory, setTaskCategory] = useState<string>("");
  const [taskSubCategory, setTaskSubCategory] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [status, setStatus] = useState<string>("Open");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [previousData, setPreviousData] = useState<DocumentData | null>(null);

  const [otherSubtask, setOtherSubtask] = useState<string>(""); // 👈 For "Others Specify"

  const customTasksCollectionName = `Tasks_${societyName}`;

  const [image, setImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  );

  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (taskRef) {
      const fetchExistingTask = async () => {
        setLoading(true);
        try {
          // Fetch the existing complain document
          const taskDocRef = doc(db, taskRef);
          const taskSnap = await getDoc(taskDocRef);
          if (taskSnap.exists()) {
            const taskData = taskSnap.data();
            setTaskName(taskData.taskName);
            setTaskCategory(taskData.taskCategory);
            setTaskSubCategory(taskData.taskSubCategory);
            setDescription(taskData.description);
            setPriority(taskData.priority);
            setStatus(taskData.status);
            setFromDate(new Date(taskData.fromDate));
            setToDate(new Date(taskData.toDate));
            if (taskData.image) {
              setImage(taskData.image);
              setSelectedImage(undefined); // keep undefined so we don’t re-upload old image
            }
            setAssignData(taskData.assigned);
            setPreviousData(taskData); // Store previous data in state
          }
        } catch (error) {
          console.error("Error fetching document:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchExistingTask();
    }
  }, [taskRef]); // Runs only if complainRef is not empty

  const handlePickImage = async () => {
    const uri = await pickImage();
    if (uri) {
      setImage(uri);
      setSelectedImage(uri);
    }
  };

  const handleCaptureImage = async () => {
    const uri = await captureImage();
    if (uri) {
      setImage(uri);
      setSelectedImage(uri);
    }
  };

  const handleUpload = async (): Promise<string | null> => {
    if (!selectedImage) return null;

    try {
      const folderName = "/Tasks/";
      const imageName = `task-${Date.now()}.jpg`;
      console.log("folderName", folderName);
      console.log("imageName", imageName);
      const { filePath } = await uploadViaApi(
        selectedImage,
        folderName,
        imageName
      );
      if (filePath) {
        const { url: signedUrl } = await fetchSignedUrl(filePath);
        return signedUrl;
      }
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
    }
    return null;
  };

  // Categories
  const categories = [
    { label: "Maintenance", value: "Maintenance" },
    { label: "Housekeeping", value: "Housekeeping" },
    { label: "Security", value: "Security" },
    { label: "Society Staff", value: "Society Staff" },
  ];

  // Subcategories mapped to categories
  const subcategoriesMap: Record<string, { label: string; value: string }[]> = {
    Maintenance: [
      { label: "Garden Trimming", value: "Garden Trimming" },
      { label: "Generator Diesel Fill", value: "Generator Diesel Fill" },
      { label: "Gym Maintenance", value: "Gym Maintenance" },
      { label: "Lift Maintenance", value: "Lift Maintenance" },
      { label: "Mosquito Fogging", value: "Mosquito Fogging" },
      { label: "Plant Watering", value: "Plant Watering" },
      { label: "Swimming Pool Cleaning", value: "Swimming Pool Cleaning" },
      { label: "Water Quality Check", value: "Water Quality Check" },
      { label: "Water Treatment", value: "Water Treatment" },
      { label: "Others Specify", value: "Others Specify" },
    ],

    Housekeeping: [
      { label: "Cleaning", value: "Cleaning" },
      { label: "Waste Disposal", value: "Waste Disposal" },
      { label: "Disinfectant Spray", value: "Disinfectant Spray" },
      { label: "Mopping Of Floors", value: "Mopping Of Floors" },
      { label: "Sanitizer Fill", value: "Sanitizer Fill" },
      { label: "Sweeping Of Streets", value: "Sweeping Of Streets" },
      { label: "Others Specify", value: "Others Specify" },
    ],
    Security: [
      { label: "Entry Vehicles Report", value: "Entry Vehicles Report" },
      { label: "Exit Vehicles Report", value: "Exit Vehicles Report" },
      { label: "Others Specify", value: "Others Specify" },
      {
        label: "Visitors Report Generation",
        value: "Visitors Report Generation",
      },
      { label: "Others Specify", value: "Others Specify" },
    ],

    "Society Staff": [
      { label: "EB Reading - Common", value: "EB Reading - Common" },
      { label: "EB Reading - Residents", value: "EB Reading - Residents" },
      {
        label: "Function Hall Bill Generation",
        value: "Function Hall Bill Generation",
      },
      {
        label: "Maintenance Bill Generation",
        value: "Maintenance Bill Generation",
      },
      { label: "Special Bill Generation", value: "Special Bill Generation" },
      { label: "Water Bill Generation", value: "Water Bill Generation" },
      { label: "Others Specify", value: "Others Specify" },
    ],
  };

  const priorityOptions = [
    { label: "Low", value: "Low" },
    { label: "Medium", value: "Medium" },
    { label: "High", value: "High" },
  ];

  const satatusOptions = [
    { label: "Open", value: "Open" },
    { label: "In Progress", value: "In Progress" },
    { label: "Resolved", value: "Resolved" },
    { label: "Rejected", value: "Rejected" },
    { label: "Blocked", value: "Blocked" },
  ];

  const formatDateTime = (date: Date) => {
    return date
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", "");
  };

  // Get subcategories based on selected category
  const subcategories = taskCategory
    ? subcategoriesMap[taskCategory] || []
    : [];

  const handleSave = async () => {
    const subtaskToSave =
      taskSubCategory === "Others Specify" ? otherSubtask : taskSubCategory;

    try {
      setLoading(true);
      const imageUrl = await handleUpload();
      console.log("");
      console.log("imageUrl", imageUrl);
      // Construct Firestore references
      const societyRef = `Societies/${societyName}`;
      const societyDocRef = doc(db, societyRef);
      const taskCollectionRef = collection(
        societyDocRef,
        customTasksCollectionName
      );

      // Get current date and time
      const currentDate = new Date();
      const formattedDateTime = formatDateTime(currentDate);
      const messageKey = `${Date.now()}`;

      // Create a new message entry
      const newMessage = {
        formattedDateTime,
        description,
        userName,
        createdAtDateTime: Timestamp.now(),
      };

      // ✅ Construct the Firestore document with necessary fields
      const taskData: Record<string, any> = {
        taskName,
        description,
        taskCategory,
        taskSubCategory: subtaskToSave,
        priority,
        status,
        fromDate: fromDate ? formatDate(fromDate) : null,
        toDate: toDate ? formatDate(toDate) : null,
        image: imageUrl,
        createdAt: formatDate(new Date()), // optional: store createdAt as string too
        createdBy: userName,
        message: { [messageKey]: newMessage },
        assigned: assignData || {}, // 👈 Save assignments here
      };

      // Add document to Firestore
      await addDoc(taskCollectionRef, taskData);

      // Show success alert and navigate back
      Alert.alert("Success", "Task Created and data saved successfully!", [
        {
          text: "OK",
          onPress: () =>
            router.push({
              pathname: "/admin/TasksAdmin/TaskTypesAdmin/OpenTasksAdmin",
              params: {},
            }), // Navigate to index screen in the same folder
        },
      ]);
    } catch (error) {
      console.error("Error saving Documents:", error);
      Alert.alert("Error", "Failed to save Documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    console.log("handel Update step 1");
    if (!taskRef || !previousData) return;

    console.log("handel Update step 2");

    try {
      setLoading(true);

      // Upload image only if user picked/captured a new one
      let imageUrl = image;
      if (selectedImage) {
        imageUrl = await handleUpload();
      }

      const subtaskToSave =
        taskSubCategory === "Others Specify" ? otherSubtask : taskSubCategory;

      // Build the changed fields object
      const updates: Record<string, any> = {};

      if (taskName !== previousData.taskName) updates.taskName = taskName;
      if (description !== previousData.description)
        updates.description = description;
      if (taskCategory !== previousData.taskCategory)
        updates.taskCategory = taskCategory;
      if (subtaskToSave !== previousData.taskSubCategory)
        updates.taskSubCategory = subtaskToSave;
      if (priority !== previousData.priority) updates.priority = priority;
      if (status !== previousData.status) updates.status = status;

      if (
        fromDate &&
        fromDate.toString() !== new Date(previousData.fromDate).toString()
      )
        updates.fromDate = formatDate(fromDate);
      if (
        toDate &&
        toDate.toString() !== new Date(previousData.toDate).toString()
      )
        updates.toDate = formatDate(toDate);

      if (imageUrl !== previousData.image) updates.image = imageUrl;
      if (JSON.stringify(assignData) !== JSON.stringify(previousData.assigned))
        updates.assigned = assignData;

      if (Object.keys(updates).length === 0) {
        Alert.alert("No Changes", "Nothing was updated.");
        return;
      }

      const taskDocRef = doc(db, taskRef);
      await updateDoc(taskDocRef, updates);

      Alert.alert("Success", "Task updated successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error updating task:", error);
      Alert.alert("Error", "Failed to update task. Please try again.");
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
      <Stack.Screen options={{ headerShown: false }} />
      <AppbarComponent title="Add Task" source="Admin" />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100, // 👈 add enough gap for footer + FAB
        }}
      >
        {/* Task Name */}
        <View style={styles.customInput}>
          <CustomInput
            label="Task Name"
            value={taskName}
            onChangeText={setTaskName}
          />
        </View>

        {/* Description */}
        <View style={styles.customInput}>
          <CustomInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline={true}
          />
        </View>

        {/* Category Dropdown */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <Dropdown
            data={categories}
            onChange={(selectedValue) => {
              setTaskCategory(selectedValue);
              setTaskSubCategory(""); // Reset subcategory when category changes
            }}
            placeholder="Select Category"
            initialValue={taskCategory}
          />
        </View>

        {/* Subcategory Dropdown */}

        <View style={styles.section}>
          <Text style={styles.label}>Subcategory</Text>
          <Dropdown
            data={subcategories}
            onChange={setTaskSubCategory}
            placeholder="Select Subcategory"
            initialValue={taskSubCategory} // Ensure placeholder is shown when category changes
          />
        </View>

        {/* Others Specify Input */}
        {taskSubCategory === "Others Specify" && (
          <View style={styles.customInput}>
            <CustomInput
              label="Specify Subtask"
              value={otherSubtask}
              onChangeText={setOtherSubtask}
            />
          </View>
        )}

        {/* Status Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Status</Text>
          <Dropdown
            data={satatusOptions}
            onChange={(selectedValue) => {
              setStatus(selectedValue);
            }}
            placeholder="Select Status"
            initialValue={status}
          />
        </View>

        {/* Priority Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Priority</Text>
          <Dropdown
            data={priorityOptions}
            onChange={(selectedValue) => {
              setPriority(selectedValue);
            }}
            placeholder="Select Priority"
            initialValue={priority}
          />
        </View>

        {/* Dates */}
        <View>
          <View style={styles.daterow}>
            <View style={styles.datesection}>
              <Text style={styles.label}>Start Date</Text>
              <PaymentDatePicker
                initialDate={fromDate}
                onDateChange={setFromDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={styles.datesection}>
              <Text style={styles.label}>End Date</Text>
              <PaymentDatePicker
                initialDate={toDate}
                onDateChange={setToDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>
        </View>

        {/* Assign */}
        <View style={styles.section}>
          <Text style={styles.label}>Assign User(s)</Text>
          <TouchableOpacity
            style={styles.assignusersbutton}
            onPress={() => {
              router.push({
                pathname: "/admin/TasksAdmin/asign",
                params: {},
              });
            }}
          >
            <Text>
              {assignData ? (
                <>
                  {assignData.staff?.length > 0 && (
                    <Text>
                      Staff:{" "}
                      {assignData.staff.map((s: any) => s.label).join(", ")}
                      {"\n"}
                    </Text>
                  )}
                  {assignData.gatekeepers?.length > 0 && (
                    <Text>
                      Gatekeepers:{" "}
                      {assignData.gatekeepers
                        .map((g: any) => g.label)
                        .join(", ")}
                      {"\n"}
                    </Text>
                  )}
                  {assignData.members?.length > 0 && (
                    <Text>
                      Members:{" "}
                      {assignData.members.map((m: any) => m.label).join(", ")}
                    </Text>
                  )}
                </>
              ) : (
                "Select People"
              )}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Choose Image Optional  */}

        <TouchableOpacity
          style={styles.button}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.buttonText}>Choose Image</Text>
        </TouchableOpacity>

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
            },
          ]}
        />

        {image && (
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="contain"
          />
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { bottom: insets.bottom }]}>
        <CustomButton
          onPress={isEditMode ? handleUpdate : handleSave}
          title={isEditMode ? "Update" : "Save"}
        />
      </View>
    </View>
  );
};

export default AddTaskAdmin;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContainer: { padding: 16 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  customInput: { width: "100%" },
  section: { marginBottom: 16, marginTop: 16 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  datesection: { flex: 1 },
  daterow: {
    flexDirection: "row",
    gap: 40,
    alignItems: "center",
    marginTop: 10,
  },
  assignusersbutton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: "#fff",
    minHeight: 50,
  },
  buttonAttachment: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    flexDirection: "row", // Arrange icon and text in a row
    alignItems: "center", // Align icon and text properly
    justifyContent: "center", // Center the content inside the button
    marginVertical: 16,
  },
  buttonAttachmentText: {
    marginLeft: 6,
    fontSize: 16,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 2,
    marginBottom: 16,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0, // 👈 ensures it's always visible at bottom
    backgroundColor: "#fff",
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  button: {
    backgroundColor: "#6200ee",
    padding: 12,
    borderRadius: 32,
    alignItems: "center",
    marginVertical: 16,
    marginHorizontal: 64,
  },
  buttonText: { color: "#fff", fontSize: 16 },
  image: {
    width: 200,
    height: 200,
    marginVertical: 10,
    alignSelf: "center", // ✅ centers horizontally
  },
});
