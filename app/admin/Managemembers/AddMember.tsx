import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { Card, Text, Button  } from "react-native-paper";
import { db } from "@/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useNavigation, useRouter  } from "expo-router";
import { useSociety } from "@/utils/SocietyContext";

const AddMember: React.FC = () => {
  const { societyName } = useSociety();
  const [societyData, setSocietyData] = useState<any>(null);
  const [selectedWing, setSelectedWing] = useState<string | null>(null);
  const router = useRouter(); // Initialize router for navigation
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
 
  const [selectedFlat, setSelectedFlat] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Define valid status keys
  type flatType = "Owner" | "Closed" | "Rent" | "Dead" | "Shop" |"no flatType";

  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    Owner: 0,
    Closed: 0,
    Rent: 0,
    Dead: 0,
    Shop: 0,
    "no flatType": 0,
  });

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Add Member",
    });
  }, []);

  useEffect(() => {
    const fetchSocietyData = async () => {
      try {
        console.log('societyName', societyName)
        const docRef = doc(db, "Societies", societyName); // Update society name as needed
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSocietyData(data.wings);
          setSelectedWing(Object.keys(data.wings)[0]); // Default to the first wing
          calculateStatusCounts(data.wings);
        } else {
          alert("Society does not exist!");
        }
      } catch (error) {
        console.error("Error fetching society data:", error);
        alert("Failed to fetch data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSocietyData();
  }, []);


  const calculateStatusCounts = (wingData: any) => {
    const counts = { Owner: 0, Closed: 0, Rent: 0, Dead: 0, Shop:0, "no flatType": 0 };
  
    if (wingData?.floorData) {
      Object.values(wingData.floorData).forEach((flats: any) => {
        Object.values(flats).forEach((flat: any) => {
          const flatType = (flat?.flatType|| "no flatType")  as flatType; // Ensure status is a valid key
          const normalizedFlatType = flatType.charAt(0).toUpperCase() + flatType.slice(1) as flatType;
          counts[normalizedFlatType] = (counts[normalizedFlatType] || 0) + 1;
          
        });
      });
    }
  
    setStatusCounts(counts);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Owner":
        return "#2196F3"; // Blue
      case "Closed":
        return "#808080"; // Grey
      case "Rent":
        return "#FFA500"; // Orange
      case "Dead":
        return "#000000"; // Black
      case "Shop":
        return "#FF00FF"; // Magenta
      default:
        return "#ffb6c1"; // light pink  for no bill
    }
  };

  const handleFlatPress = (flatType: string, flatNumber: string) => {
    if (flatType === "Rent") {
      setSelectedFlat(flatNumber);
      setShowModal(true); // Show the modal for flats with "Rent" type
    } else {
      router.push({
        pathname: "/admin/Managemembers/MemberDetails",
        params: {
          wing: selectedWing,
          flatNumber,
          flatType,
        },
      });
    }
  };

  const handleTypeSelect = (type: string) => {
    setShowModal(false);
    router.push({
      pathname: "/admin/Managemembers/MemberDetails",
      params: {
        wing: selectedWing,
        flatNumber: selectedFlat,
        flatType: type,
      },
    });
  };

  const renderFlat = ({ item, flats }: { item: string; flats: Record<string, any> }) => {
    const flatData = flats[item];
    const flatType = flatData.flatType;

    return (
      <Pressable onPress={() => handleFlatPress(flatType, item)}>
        <Card
          style={[
            styles.card,
            { backgroundColor: getStatusColor(flatType) },
          ]}
          mode="elevated"
        >
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardText}>
              {item}
            </Text>
          </Card.Content>
        </Card>
      </Pressable>
    );
  };


  const renderFloor = ({ item }: { item: [string, Record<string, any>] }) => {
    const [floor, flats] = item;
    const flatNumbers = Object.keys(flats);

    return (
      <View>
        <Text style={styles.floorHeading}>{floor}</Text>
        <FlatList
          data={flatNumbers}
          keyExtractor={(flatNumber) => `${floor}-${flatNumber}`}
          renderItem={({ item }) => renderFlat({ item, flats })}
          numColumns={3}
          contentContainerStyle={styles.flatListContent}
        />
      </View>
    );
  };

  useEffect(() => {
    if (selectedWing && societyData) {
      calculateStatusCounts(societyData[selectedWing]); // Calculate status counts for the selected wing
    }
  }, [selectedWing, societyData]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Loading Wing Setup...</Text>
      </View>
    );
  }

 

  return (
    <View style={styles.container}>
    {/* Wing Selector */}
    <View style={styles.toggleContainer}>
      {societyData
        ? Object.keys(societyData)
          .sort((a, b) => a.localeCompare(b)) // Sort wings alphabetically
          .map((wing) => (
            <Pressable
              key={wing}
              onPress={() => setSelectedWing(wing)}
              style={[
                styles.toggleButton,
                selectedWing === wing && styles.selectedToggle,
              ]}
            >
              <Text style={styles.toggleText}>{wing}</Text>
            </Pressable>
          ))
        : <Text>Loading Wings...</Text> /* Show a loading indicator or message */}
    </View>

    {/* Legends */}
    <View style={styles.legendsContainer}>
        {Object.entries(statusCounts).map(([status, count]) => (
          <View key={status}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: getStatusColor(status) }]} />
            <Text>{`(${count})`}</Text>
          </View>
          <Text>{`${status.charAt(0).toUpperCase() + status.slice(1)}`}</Text>
          </View>
           
        ))}
      </View>
    
    {/* Floor Data */}
    {selectedWing && societyData[selectedWing]?.floorData ? (
        <FlatList
          data={Object.entries(societyData[selectedWing].floorData).sort(
            ([floorA], [floorB]) => {
              // Extract the numeric part of the floor names (e.g., "Floor 1", "Floor 2")
              const numA = parseInt(floorA.replace(/\D/g, ""), 10);
              const numB = parseInt(floorB.replace(/\D/g, ""), 10);
              return numA - numB; // Sort numerically in ascending order
            }
          ) as [string, Record<string, any>][]} // Type assertion here} 
          keyExtractor={([floor]) => floor}
          renderItem={renderFloor}
          contentContainerStyle={styles.flatListContent}
        />
      ) : (
        <Text style={styles.info}>
          No floor data available for Wing {selectedWing}.
        </Text>
      )}

      {/* Modal for selecting type */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Type</Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#6200EE" }]}
              onPress={() => handleTypeSelect("Owner")}
            >
              <Text style={styles.modalButtonText}>Owner</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#FFA500" }]}
              onPress={() => handleTypeSelect("Rent")}
            >
              <Text style={styles.modalButtonText}>Rent</Text>
            </TouchableOpacity>
            <Button onPress={() => setShowModal(false)}>Cancel</Button>
          </View>
        </View>
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  legendsContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 16,
    height: 16,
    marginRight: 8,
    borderRadius: 8,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  selectedToggle: {
    backgroundColor: "#6200ee",
  },
  toggleText: {
    color: "#000",
    fontWeight: "bold",
    textAlign: "center",
  },
  floorHeading: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  info: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 16,
  },
  flatListContent: {
    paddingHorizontal: 8,
  },
  card: {
    margin: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    elevation: 2,
  },
  cardText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
    color: '#fff',
  },
  amountText: {
    textAlign: "center",
    fontWeight: "bold",
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: 300,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  modalButton: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  modalButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  
});


export default AddMember;