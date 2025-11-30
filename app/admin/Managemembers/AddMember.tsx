import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Text } from "react-native-paper";
import { db } from "@/firebaseConfig";
import { collectionGroup, getDocs } from "firebase/firestore";
import { useRouter } from "expo-router";
import { useSociety } from "@/utils/SocietyContext";
import WingsFlatsGrid from "@/components/WingsFlatsGrid";
import AppbarComponent from "@/components/AppbarComponent";
import { Ionicons } from "@expo/vector-icons";
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";

type FlatData = {
  flatType: string;
  resident: string;
  memberStatus: string;
  ownerRegisterd?: string;
  renterRegisterd?: string;
};
type FlatsData = Record<string, Record<string, Record<string, FlatData>>>;

const AddMember: React.FC = () => {
  const { societyName } = useSociety();
  useCustomBackHandler("/admin/Managemembers");

  const router = useRouter(); // Initialize router for navigation
  const [loading, setLoading] = useState(false);

  const customFlatsSubcollectionName = `${societyName} flats`;

  const [flatsData, setFlatsData] = useState<FlatsData>({});
  const [alreadyRegisteredOnce, setAlreadyRegisteredOnce] = useState(false);

  const [userTypeModalVisible, setUserTypeModalVisible] = useState(false); // For user type selection

  const [selectedFlat, setSelectedFlat] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectedFlatType, setSelectedFlatType] = useState<string | null>(null);
  const [selectedWing, setSelectedWing] = useState<string | null>(null);

  const fetchFlatsData = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlatsData();
  }, []);

  // 🧭 Handle flat card press
  const handleFlatPress = (
    flatId: string,
    flatType: string,
    floor: string,
    wing: string
  ) => {
    const selectedFlatData = flatsData[wing][floor][flatId];

    // 🧠 Common setup
    const proceedToRegistration = (reRegister: boolean) => {
      setSelectedWing(wing);
      setSelectedFlat(flatId);
      setSelectedFlatType(flatType);
      setSelectedFloor(floor);
      setAlreadyRegisteredOnce(reRegister);

      if (flatType === "Rent") {
        setUserTypeModalVisible(true);
      } else {
        router.push({
          pathname: "/admin/Managemembers/MemberDetails",
          params: {
            societyName,
            wing,
            floorName: floor,
            flatNumber: flatId,
            flatType,
            userType: "Owner",
            alreadyRegisteredOnce: reRegister ? "true" : "false",
          },
        });
      }
    };

    // 🧠 Logic for flat status
    if (selectedFlatData.memberStatus === "Registered") {
      Alert.alert("Already Registered", "This unit is already registered.");
      return; // ✅ Stop further execution, do not proceed
    } else if (selectedFlatData.memberStatus === "Pending Approval") {
      Alert.alert(
        "Pending Approval",
        "The registration of this unit is still under approval."
      );
    } else {
      proceedToRegistration(false);
    }
  };

  // 🧩 Modal navigation helper
  const navigateToMemberDetails = (userType: "Owner" | "Renter") => {
    router.push({
      pathname: "/admin/Managemembers/MemberDetails",
      params: {
        societyName,
        wing: selectedWing,
        floorName: selectedFloor,
        flatNumber: selectedFlat,
        flatType: selectedFlatType,
        userType,
        alreadyRegisteredOnce: alreadyRegisteredOnce ? "true" : "false",
      },
    });
    setUserTypeModalVisible(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Loading Wing Setup...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppbarComponent
        title="Add Member"
        source="Admin"
        backRoute="/admin/Managemembers"
      />
      <WingsFlatsGrid
        flatsData={flatsData}
        onFlatPress={handleFlatPress}
        showRegisteredLegend
      />

      {/* User Type Modal */}

      {/* 🧩 User Type Modal */}
      {userTypeModalVisible && (
        <Modal
          animationType="slide"
          transparent
          visible={userTypeModalVisible}
          onRequestClose={() => setUserTypeModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setUserTypeModalVisible(false)}
              >
                <Ionicons name="close-circle" size={32} color="black" />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>Select Type</Text>

              <View style={styles.modalButtons}>
                {/* 🏠 Owner Button */}
                <Pressable
                  style={[styles.button, styles.buttonYes]}
                  onPress={() => {
                    const flatData =
                      flatsData[selectedWing!][selectedFloor!][selectedFlat!];
                    if (flatData.ownerRegisterd === "Registered") {
                      Alert.alert(
                        "Already Registered",
                        "This unit Owner is already registered."
                      );
                    } else if (flatData.ownerRegisterd === "Pending Approval") {
                      Alert.alert(
                        "Pending Approval",
                        "The registration of this unit Owner is still under approval."
                      );
                    } else {
                      navigateToMemberDetails("Owner");
                    }
                  }}
                >
                  <Text style={styles.buttonText}>Owner</Text>
                </Pressable>

                {/* 👤 Renter Button */}
                <Pressable
                  style={[styles.button, styles.buttonNo]}
                  onPress={() => {
                    const flatData =
                      flatsData[selectedWing!][selectedFloor!][selectedFlat!];
                    if (flatData.ownerRegisterd !== "Registered") {
                      Alert.alert(
                        "Owner Should Register First",
                        "The owner of this unit must register before proceeding."
                      );
                    } else {
                      navigateToMemberDetails("Renter");
                    }
                  }}
                >
                  <Text style={styles.buttonText}>Renter</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Dimmed background
  },
  modalContent: {
    width: "80%", // Adjust modal width
    backgroundColor: "#fff", // Modal background color
    borderRadius: 10, // Rounded corners
    padding: 20, // Inner padding
    alignItems: "center", // Center content horizontally
    shadowColor: "#000", // Shadow for iOS
    shadowOffset: { width: 0, height: 2 }, // Shadow position
    shadowOpacity: 0.25, // Shadow transparency
    shadowRadius: 4, // Shadow blur radius
    elevation: 5, // Shadow for Android
  },
  closeButton: {
    position: "absolute",
    top: 5,
    right: 5,
    borderRadius: 20,
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row", // Arrange buttons horizontally
    justifyContent: "space-around", // Space between buttons
    width: "100%",
  },
  button: {
    padding: 10,
    borderRadius: 5,
    minWidth: 80,
    alignItems: "center",
  },
  buttonYes: {
    backgroundColor: "#2196F3", // Blue for Yes
  },
  buttonNo: {
    backgroundColor: "#FFA500", // Orange for No
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default AddMember;
