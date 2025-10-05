import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  SectionList,
  ActivityIndicator,
  Linking,
} from "react-native";
import React, { useState, useEffect } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { getDocs, collectionGroup, query, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";
import { FontAwesome } from "@expo/vector-icons"; // Import Expo icons
import PaymentDatePicker from "@/utils/paymentDate";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const VisitorHistory = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { societyName } = useSociety();
  const { source } = useLocalSearchParams();

  const customVisitorCollectionName = `visitor_${societyName}`;

  const [loading, setLoading] = useState(false);

  const [visitorsData, setVisitorsData] = useState<any[]>([]);

  // Modal and Filter States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    if (source === "visitorstats") {
      return date; // Set to current date if source is "visitorstats"
    } else {
      date.setDate(date.getDate() - 2); // Default: Day before yesterday
      return date;
    }
  });
  const [toDate, setToDate] = useState(new Date(Date.now()));

  const [tempFromDate, setTempFromDate] = useState(fromDate);
  const [tempToDate, setTempToDate] = useState(toDate);

  const resetFilters = () => {
    setIsModalVisible((prev) => !prev);
  };

  const makeCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch((err) =>
      console.error("Error opening dialer:", err)
    );
  };

  const fetchAllVisitors = async () => {
    try {
      // Convert fromDate and toDate to Firestore-compatible Timestamps
      const fromTimestamp = fromDate
        ? new Date(fromDate.setHours(0, 0, 0, 0))
        : null;
      const toTimestamp = toDate
        ? new Date(toDate.setHours(23, 59, 59, 999))
        : null;
      // Query: Fetch visitors where visitorStatus is "CheckedOut" and createdAt is within the range
      let visitorQuery = query(
        collectionGroup(db, customVisitorCollectionName),
        where("visitorStatus", "==", "CheckedOut"),
        where("createdAt", ">=", fromTimestamp),
        where("createdAt", "<=", toTimestamp)
      );

      // Fetch visitors
      const visitorSnapshot = await getDocs(visitorQuery);

      // Extract data
      const checkedOutVisitors = visitorSnapshot.docs.map((doc) => {
        const docData = doc.data();
        const docPath = doc.ref.path;
        const pathSegments = docPath.split("/");
        return {
          id: doc.id,
          wing: pathSegments[3],
          floorName: pathSegments[5],
          flatNumber: pathSegments[7],
          adminStaffDocPath: docPath,
          createdAt: docData.createdAt ? docData.createdAt.toDate() : null, // Convert Firestore Timestamp to Date
          ...docData, // Include other Firestore fields
        };
      });

      // Sort by latest createdAt timestamp
      checkedOutVisitors.sort(
        (a, b) =>
          b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
      );

      // Set state with staff data
      setVisitorsData(checkedOutVisitors);
    } catch (error) {
      console.error("Error fetching Checked Out Visitors data:", error);
    }
  };

  useEffect(() => {
    fetchAllVisitors();
  }, [fromDate, toDate]);

  const renderVisitor = ({ item }: { item: any }) => {
    const hasImage =
      item.selectedImageUrl && item.selectedImageUrl.trim() !== "";
    const initials = item.name ? item.name.charAt(0).toUpperCase() : "?";

    return (
      <View style={styles.cardview}>
        <View style={styles.cardCointainer}>
          <View style={styles.rowedy}>
            <View style={styles.profileContainer}>
              {hasImage ? (
                <Image
                  source={{ uri: item.selectedImageUrl }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.initialsContainer}>
                  <Text style={styles.initialsText}>{initials}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={{ flex: 1, marginRight: 8 }}
              onPress={() =>
                router.push({
                  pathname: "../visitorDetails",
                  params: {
                    item: JSON.stringify(item),
                  }, // Pass item as a string
                })
              }
            >
              {item.visitingTo?.trim() && (
                <Text style={{ fontWeight: "bold" }}>{item.visitingTo}</Text>
              )}
              <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
              <Text style={{ marginBottom: 8 }}>{item.mobileNumber}</Text>
            </TouchableOpacity>
          </View>
          <View>
            {/* Call Button */}
            <TouchableOpacity
              style={styles.buttonWrapper}
              onPress={() => {
                makeCall(item.mobileNumber);
              }}
            >
              <FontAwesome name="phone" size={24} color="#2196F3" />
            </TouchableOpacity>
            <View
              style={{
                backgroundColor: "#000",
                paddingHorizontal: 5,
                paddingVertical: 2,
                borderRadius: 2,
              }}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                {item.visitorType}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.inoutrow}>
          <View style={styles.inoutview}>
            <Text style={styles.inText}>IN: {item.formattedDateTime}</Text>
          </View>
          {item.formatteCheckOutdDateTime ? (
            <View style={styles.inoutview}>
              <Text style={styles.outText}>
                OUT: {item.formatteCheckOutdDateTime}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const formatDateTime = (date: Date) => {
    return date
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(",", ""); // Removes comma for cleaner formatting
  };

  const groupVisitorsByDate = (visitorsData: any[]) => {
    const groupedData = visitorsData.reduce((acc, visitor) => {
      const createdAt = visitor.createdAt.toDate(); // Convert Firestore timestamp to JS Date
      const date = formatDateTime(createdAt); // Format date as "09 Mar 2025"

      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(visitor);
      return acc;
    }, {});

    return Object.keys(groupedData).map((date) => ({
      title: date,
      data: groupedData[date],
    }));
  };

  const sections = groupVisitorsByDate(visitorsData);

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
      <AppbarComponent
        title="Visitor History"
        source="Admin"
        onPressFilter={() => resetFilters()}
      />

      {/* display view based on isModalVisible */}

      {isModalVisible && (
        <View>
          <View style={styles.daterow}>
            <View style={styles.datesection}>
              <Text style={styles.label}>From Date</Text>
              <PaymentDatePicker
                initialDate={fromDate}
                onDateChange={setTempFromDate}
              />
            </View>
            <View style={styles.datesection}>
              <Text style={styles.label}>To Date</Text>
              <PaymentDatePicker
                initialDate={toDate}
                onDateChange={setTempToDate}
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.goButton}
            onPress={() => {
              if (tempFromDate) {
                setFromDate(tempFromDate);
              }

              if (tempToDate) {
                setToDate(tempToDate);
              }
              setIsModalVisible(false); // Close modal after applying filters
            }}
          >
            <Text style={styles.goButtonText}>Go</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Date and Ledger Summary */}
      <TouchableOpacity onPress={() => resetFilters()}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryText}>
            From: {formatDateTime(fromDate)} To: {formatDateTime(toDate)}
          </Text>
        </View>
      </TouchableOpacity>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderVisitor}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.header}>{title}</Text>
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        ListEmptyComponent={
          <Text style={styles.emptyMessage}>No Visitors Found</Text>
        }
      />
    </View>
  );
};

export default VisitorHistory;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  loader: { marginTop: 20 },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardview: {
    marginBottom: 16,
    padding: 8,
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  innerButton: {
    flexDirection: "row", // Align icon and text horizontally
    alignItems: "center", // Center items vertically
    justifyContent: "center", // Center items inside the button
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginHorizontal: 5,
    borderRadius: 2,
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
  buttonWrapper: {
    padding: 10, // Add padding for visibility
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    marginLeft: 2, // Adds spacing between icon and text
    marginRight: 2,
    fontSize: 14,
  },
  profileContainer: {
    width: 50,
    height: 50,
    borderRadius: 30, // Makes it circular
    overflow: "hidden", // Ensures the image stays within the circle
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6200ee", // Default background for initials
  },
  profileImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover", // Ensures the image covers the circle
  },
  initialsContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  rowedy: {
    flexDirection: "row",
    alignItems: "flex-start", // Ensures proper alignment
    gap: 16, // Provides spacing between elements without forcing them apart
  },
  cardCointainer: {
    flexDirection: "row",
    alignItems: "flex-start", // Ensures proper alignment
    paddingRight: 60, // Give some padding to avoid cut-off
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    backgroundColor: "#F5F5F5",
    padding: 10,
    marginTop: 10,
    textAlign: "center", // Centers text horizontally
    alignSelf: "center", // Ensures alignment within parent
    width: "100%", // Ensures full-width for centering
  },
  inoutrow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  inoutview: {
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  inText: {
    color: "green",
    fontSize: 14,
    fontWeight: "bold",
  },
  outText: {
    color: "red",
    fontSize: 14,
    fontWeight: "bold",
  },
  summaryHeader: { padding: 16 },
  summaryText: { fontSize: 14, fontWeight: "bold" },
  datesection: { marginVertical: 10, flex: 1, marginHorizontal: 16 },
  label: {
    fontSize: 14,
    color: "#555",
  },
  daterow: {
    flexDirection: "row",
    gap: 24,
    alignItems: "center",
    marginTop: 12,
  },
  goButton: {
    backgroundColor: "green",
    justifyContent: "center", // Center text vertically
    alignItems: "center", // Center text horizontally
    paddingHorizontal: 15, // Ensures the button expands based on content
    paddingVertical: 10,
    borderRadius: 5,
    marginHorizontal: 16,
    marginBottom: 10,
    alignSelf: "flex-start", // Ensures the button takes space based on content
  },
  goButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
