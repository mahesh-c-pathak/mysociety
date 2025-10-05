import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import React, { useEffect, useState } from "react";

import { useNavigation } from "@react-navigation/native";

import { useRouter } from "expo-router";
import { db } from "@/firebaseConfig";
import {
  collection,
  getDocs,
  collectionGroup,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

import { useSociety } from "@/utils/SocietyContext";

import AppbarComponent from "@/components/AppbarComponent";
import AppbarMenuComponent from "@/components/AppbarMenuComponent";
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";
// Define the structure of flatsData
type FlatData = {
  flatType: string;
  resident: string;
  memberStatus: string;
  ownerRegisterd?: string; // Optional property
  renterRegisterd?: string; // Optional property
  billStatus: string;
  billAmount?: number;
  overdueDays?: number;
  flatColor: string;
  flatCurrentBalance: number;
};

type FlatsData = Record<string, Record<string, Record<string, FlatData>>>;

const StatusType = [
  "paid",
  "unpaid",
  "Pending Approval",
  "overdue",
  "Advanced Payment",
];

const flatColors: Record<string, string> = {
  paid: "#4CAF50", // Green
  unpaid: "#FA8072", // Salmon
  "Pending Approval": "#FFEB3B", // Yellow
  Overdue: "#FF0000", // Red
  "Advanced Payment": "#2196F3", // Blue
};

const StatusColor: Record<string, string> = {
  paid: "#4CAF50", // Green
  unpaid: "#FA8072", // Salmon
  "Pending Approval": "#FFEB3B", // Yellow
  overdue: "#FF0000", // Red
  "Advanced Payment": "#2196F3", // Blue
};

const CollectionNew = () => {
  const { societyName: mysocietyName } = useSociety();

  const [loading, setLoading] = useState(true);
  const router = useRouter();
  useCustomBackHandler("/admin"); // back always goes to Screen3

  const navigation = useNavigation();

  const customFlatsSubcollectionName = `${mysocietyName} flats`;
  const customFlatsBillsSubcollectionName = `${mysocietyName} bills`;

  const [selectedWing, setSelectedWing] = useState<string | null>(null);

  const [flatsData, setFlatsData] = useState<FlatsData>({}); // Explicit type for flatsData
  const [flatTypeCounts, setFlatTypeCounts] = useState<Record<string, number>>(
    {}
  );

  const currentDate = new Date();
  currentDate.setUTCHours(0, 0, 0, 0); // Normalize to start of day in UTC

  const dateString = new Date().toISOString().split("T")[0];

  useEffect(() => {
    // Dynamically hide the header for this screen
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const getFlatStatusAndColor = (bills: string[]) => {
    if (bills.includes("Pending Approval")) {
      return {
        flatStatus: "Pending Approval",
        flatColor: StatusColor["Pending Approval"],
      };
    }
    if (bills.includes("overdue")) {
      return { flatStatus: "overdue", flatColor: StatusColor["overdue"] };
    }
    if (bills.includes("unpaid")) {
      return { flatStatus: "unpaid", flatColor: StatusColor["unpaid"] };
    }
    if (bills.includes("Advanced Payment")) {
      return {
        flatStatus: "Advanced Payment",
        flatColor: StatusColor["Advanced Payment"],
      };
    }
    return { flatStatus: "paid", flatColor: StatusColor["paid"] };
  };

  useEffect(() => {
    const fetchflatbillStatus = async () => {
      setLoading(true);
      try {
        const flatsQuerySnapshot = await getDocs(
          collectionGroup(db, customFlatsSubcollectionName)
        );
        const data: Record<string, any> = {};
        for (const flatDoc of flatsQuerySnapshot.docs) {
          const flatData = flatDoc.data();
          const flatId = flatDoc.id;

          const flatPath = flatDoc.ref.path;
          const pathSegments = flatPath.split("/");
          const wing = pathSegments[3];
          const floor = pathSegments[5];

          if (!data[wing]) data[wing] = {};
          if (!data[wing][floor]) data[wing][floor] = {};

          const flatType = flatData.flatType || "";

          const flatbillRef = collection(
            flatDoc.ref,
            customFlatsBillsSubcollectionName
          );
          // const flatbillsdsnapshot = await getDocs(flatbillRef);
          const currentBalanceSubcollectionName = `currentBalance_${flatId}`;
          const currentBalanceSubcollection = collection(
            flatDoc.ref,
            currentBalanceSubcollectionName
          );
          const currentBalancequery = query(
            currentBalanceSubcollection,
            where("date", "<=", dateString),
            orderBy("date", "desc"),
            limit(1)
          );

          // Fetch both collections in parallel
          const [flatbillsdsnapshot, currentBalancesnapshot] =
            await Promise.all([
              getDocs(flatbillRef),
              getDocs(currentBalancequery),
            ]);

          // set current balance
          let flatCurrentBalance = 0;
          if (!currentBalancesnapshot.empty) {
            const data = currentBalancesnapshot.docs[0].data();
            flatCurrentBalance += data.cumulativeBalance;
          }

          const billStatuses: string[] = [];
          let flatUnpaidAmount = 0;
          let maxOverdueDays = 0; // Track max overdue days
          for (const flatbillDoc of flatbillsdsnapshot.docs) {
            const billData = flatbillDoc.data();

            if (billData.status) {
              if (billData.status === "unpaid") {
                const billDueDate = billData.dueDate;
                flatUnpaidAmount += billData.amount;
                const billDueDateindatetype = new Date(
                  billDueDate + "T00:00:00"
                ); // Convert string to Date (UTC start of day)
                billDueDateindatetype.setHours(0, 0, 0, 0); // Normalize date
                // Calculate overdue days
                // Convert dates to timestamps for subtraction
                const overdueDays = Math.floor(
                  (currentDate.getTime() - billDueDateindatetype.getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                if (overdueDays > 0) {
                  billStatuses.push("overdue");

                  maxOverdueDays = Math.max(maxOverdueDays, overdueDays); // Update max overdue days
                } else {
                  billStatuses.push(billData.status);
                }
              } else {
                billStatuses.push(billData.status);
              }
            }
          }

          const { flatStatus, flatColor } = getFlatStatusAndColor(billStatuses);

          // console.log( `Flat ID: ${flatDoc.id}, Status: ${flatStatus}, Color: ${flatColor}`);

          data[wing][floor][flatId] = {
            flatType,
            resident: flatData.resident || "",
            memberStatus: flatData.memberStatus || "",
            ownerRegisterd: flatData.ownerRegisterd || "",
            renterRegisterd: flatData.renterRegisterd || "",
            billStatus: flatStatus,
            overdueDays: maxOverdueDays, // Add overdue days to the state
            billAmount: flatUnpaidAmount, // Add bill amount to the state
            flatColor,
            flatCurrentBalance,
          };
        }
        setFlatsData(data);
      } catch (error) {
        console.error("Error fetching flats data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchflatbillStatus();
  }, []);

  useEffect(() => {
    // Set the first wing as selected when flatsData is loaded
    if (!selectedWing && Object.keys(flatsData).length > 0) {
      setSelectedWing(Object.keys(flatsData)[0]); // Select the first wing (e.g., "A")
    }
  }, [flatsData]);

  useEffect(() => {
    if (selectedWing && flatsData[selectedWing]) {
      const counts: Record<string, number> = {};
      Object.values(flatsData[selectedWing]).forEach((floor) => {
        Object.values(floor).forEach((flat) => {
          const flatType = flat.flatType || "";
          counts[flatType] = (counts[flatType] || 0) + 1;
        });
      });
      setFlatTypeCounts(counts);
    } else {
      setFlatTypeCounts({});
    }
  }, [selectedWing, flatsData]);

  const handleFlatPress = (
    flatId: string,
    flatType: string,
    floor: string,
    wing: string
  ) => {
    console.log(
      `Yes pressed for flat: ${flatId}, flatType: ${flatType}, Floor: ${floor}, Wing: ${wing}`
    );

    router.push({
      pathname: "/admin/Collection/FlatCollectionSummary",
      params: {
        wing: wing,
        floorName: floor,
        flatNumber: flatId,
      },
    });
  };

  const [menuVisible, setMenuVisible] = useState(false);
  const handleMenuOptionPress = (option: string) => {
    console.log(`${option} selected`);
    setMenuVisible(false);
  };
  const closeMenu = () => {
    setMenuVisible(false);
  };

  const resetFilters = () => {
    console.log("Reset Filter Pressed");
  };

  const renderFlats = () => {
    if (!selectedWing || !flatsData[selectedWing]) return null;

    return (
      <View style={styles.outerscrollContent}>
        <ScrollView horizontal style={styles.scrollView}>
          <View style={styles.scrollContent}>
            {Object.keys(flatsData[selectedWing])
              .sort((a: string, b: string) => {
                const extractNumber = (floor: string): number => {
                  if (floor === "Floor G") return -1; // Assign a low value to "Floor G"
                  const num = floor.match(/\d+/);
                  return num ? parseInt(num[0], 10) : NaN;
                };

                return extractNumber(b) - extractNumber(a); // Sort descending
              })
              .map((floor) => (
                <View key={floor} style={styles.floorContainer}>
                  <View style={styles.row}>
                    {Object.keys(flatsData[selectedWing][floor]).map((flat) => {
                      const flatData = flatsData[selectedWing][floor][flat];
                      const flatColor =
                        flatData.flatColor || flatColors["paid"]; // Default to No Bill color if flatType is missing
                      return (
                        <TouchableOpacity
                          key={flat}
                          style={[
                            styles.flatContainer,
                            { backgroundColor: flatColor },
                          ]}
                          onPress={() =>
                            handleFlatPress(
                              flat,
                              flatData.flatType,
                              floor,
                              selectedWing
                            )
                          }
                        >
                          <Text style={styles.flatText}>{flat}</Text>
                          {flatData.billStatus.toLowerCase() === "unpaid" && (
                            <Text style={styles.billText}>
                              ₹ {flatData.billAmount}
                            </Text>
                          )}
                          {flatData.billStatus === "overdue" && (
                            <>
                              <Text style={styles.billText}>
                                {flatData.overdueDays} days
                              </Text>
                              <Text style={styles.billText}>
                                ₹ {flatData.billAmount}
                              </Text>
                            </>
                          )}
                          {flatData.flatCurrentBalance > 0 && (
                            <>
                              <View
                                style={{
                                  backgroundColor: "#3F704D",
                                  marginBottom: 2,
                                  width: "100%",
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <Text
                                  style={[styles.billText, { fontSize: 12 }]}
                                >
                                  ₹{flatData.flatCurrentBalance.toFixed(2)}
                                </Text>
                              </View>
                            </>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={closeMenu}>
      <View style={styles.container}>
        {/* Top Appbar */}
        <AppbarComponent
          title="Collection New"
          source="Admin"
          onPressFilter={() => resetFilters()}
          onPressThreeDot={() => setMenuVisible(!menuVisible)}
        />

        {/* Three-dot Menu */}
        {/* Custom Menu */}
        {menuVisible && (
          <AppbarMenuComponent
            items={["Download PDF", "Download Excel"]}
            onItemPress={handleMenuOptionPress}
            closeMenu={closeMenu}
          />
        )}

        {/* Select Wing */}
        <View style={styles.toggleContainer}>
          {Object.keys(flatsData).map((wing) => (
            <Pressable
              key={wing}
              onPress={() => setSelectedWing(wing)}
              style={[
                styles.toggleButton,
                selectedWing === wing && styles.selectedToggle,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  selectedWing === wing && styles.selectedtoggleText,
                ]}
              >
                {wing}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Legend Container */}

        <View style={styles.legendContainer}>
          {StatusType.map((type) => (
            <View key={type} style={styles.legendItem}>
              <View style={styles.legendcountContainer}>
                <View
                  style={[
                    styles.legendColor,
                    { backgroundColor: StatusColor[type] },
                  ]}
                />
                <Text style={styles.legendText}>
                  ({flatTypeCounts[type] || 0}) {/* Show count or 0 */}
                </Text>
              </View>
              <Text style={[styles.legendText, { flexWrap: "wrap" }]}>
                {type.split(" ").map((word, index) => (
                  <Text key={index}>
                    {word}
                    {"\n"}
                  </Text>
                ))}
              </Text>
            </View>
          ))}
        </View>

        {/* Selected Wings Flat Grid */}

        {selectedWing && (
          <Text style={styles.headingText}>Wing {selectedWing}</Text>
        )}

        {renderFlats()}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default CollectionNew;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#0288d1", // Match background color from the attached image
    elevation: 4,
  },
  titleStyle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
    marginTop: 16,
    alignItems: "center",
  },
  toggleButton: {
    margin: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    height: 50, // Default height
    minWidth: 50, // Optional for consistency
    alignItems: "center", // Center content horizontally
    justifyContent: "center", // Center content vertically
  },
  selectedToggle: {
    backgroundColor: "#6200ee",
    height: 60, // Explicitly set a larger height for the selected button
    minWidth: 60, // Optional for a bigger width
    alignItems: "center", // Center content horizontally
    justifyContent: "center", // Center content vertically
  },
  toggleText: {
    fontWeight: "bold",
    textAlign: "center",
  },
  selectedtoggleText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    textAlign: "center",
  },
  flatList: {
    justifyContent: "center",
    alignItems: "center",
  },

  flatText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginBottom: 6,
  },
  headingText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 8,
  },
  scrollView: {
    flexGrow: 1,
  },
  outerscrollContent: {
    margin: 16,
    paddingHorizontal: 4,
    paddingTop: 8,
    backgroundColor: "#dddddd",

    borderWidth: 1, // Optional for outline
    borderColor: "#e0e0e0", // Optional for outline
    borderRadius: 8,
  },
  scrollContent: {
    flexDirection: "column", // Stack floors vertically
    paddingHorizontal: 16,
  },
  floorContainer: {
    marginBottom: 8,
  },
  floorTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row", // Flats in a row
    flexWrap: "wrap", // Allows multiple rows
    justifyContent: "center", // Adjust as needed
  },
  flatContainer: {
    backgroundColor: "#4caf50",
    margin: 4,
    minWidth: 70,
    minHeight: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    alignSelf: "stretch", // Allows dynamic height
  },

  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    gap: 8, // Add spacing between legend items (React Native 0.71+)
  },
  legendItem: {
    alignItems: "center", // Center align both color and text
    marginHorizontal: 4, // Space between items
    marginBottom: 8, // Space between rows
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginBottom: 4, // Space between color box and text
  },
  legendText: {
    fontSize: 12, // Adjust text size as needed
    textAlign: "center",
  },
  legendcountContainer: {
    flexDirection: "row",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
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
  closeButton: {
    position: "absolute",
    top: 5,
    right: 5,
    borderRadius: 20,
    padding: 5,
  },
  billText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "bold",
    margin: 2,
  },
});
