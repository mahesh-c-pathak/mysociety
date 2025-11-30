import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import React, { useEffect, useState } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import { useLocalSearchParams, useRouter } from "expo-router";
import { db } from "@/firebaseConfig";
import { collection, doc, getDocs } from "firebase/firestore";
import { globalStyles } from "@/styles/globalStyles";
import { Avatar } from "react-native-paper";

const FlatMemberHistory = () => {
  const router = useRouter();
  const {
    flatRef,
    parsedsocietyName,
    parsedwing,
    parsedfloorName,
    parsedflatNumber,
    parsedItemDetailFlatType,
    parsedItemDetailUserType,
    parseduserId,
  } = useLocalSearchParams();

  const [oldMembers, setOldMembersRef] = useState<any[]>([]);

  // ✅ Helper to format Firestore timestamp or ISO string
  const formatDate = (dateValue: any) => {
    if (!dateValue) return "—";
    const date =
      typeof dateValue === "string"
        ? new Date(dateValue)
        : dateValue.toDate?.() || new Date(dateValue);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  useEffect(() => {
    const fetchMemberHistory = async () => {
      try {
        if (!flatRef) return;

        const flatDocRef = doc(db, flatRef as string);
        const oldMembersCollectionName = `${parsedsocietyName}_${parsedwing}_${parsedflatNumber}_oldFlatMembers`;
        const oldMembersRef = collection(flatDocRef, oldMembersCollectionName);
        const oldMembersSnapshot = await getDocs(oldMembersRef);

        if (!oldMembersSnapshot.empty) {
          const oldMembersList: any[] = [];

          oldMembersSnapshot.forEach((memberDoc) => {
            oldMembersList.push({
              id: memberDoc.id,
              ...memberDoc.data(),
            });
          });

          // Sort latest first (optional)
          oldMembersList.sort(
            (a, b) =>
              new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );

          setOldMembersRef(oldMembersList);
        } else {
          setOldMembersRef([]);
        }
      } catch (error) {
        console.log("❌ Error fetching flat member history data:", error);
      }
    };

    fetchMemberHistory();
  }, [flatRef]);

  const renderMemberHistory = ({ item }: { item: any }) => {
    const { userName, startDate, endDate, userType, usermobileNumber } = item;

    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);

    return (
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={() => {
          router.push({
            pathname: "/admin/Managemembers/FlatMemberHistoryDetails",
            params: {
              itemdetail: JSON.stringify(item),
              flatRef,
              parsedsocietyName,
              parsedwing,
              parsedfloorName,
              parsedflatNumber,
              parsedItemDetailFlatType,
              parsedItemDetailUserType,
              parseduserId,
            },
          });
        }}
      >
        {/* Avatar */}
        <Avatar.Text
          size={48}
          label={userName?.charAt(0)?.toUpperCase() || "?"}
          style={{
            backgroundColor:
              userType?.toLowerCase() === "owner"
                ? "#2196F3"
                : userType?.toLowerCase() === "renter"
                  ? "#FFA500"
                  : "#9E9E9E",
          }}
        />

        {/* Member Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userDetails}>
            Duration: {formattedStart} - {formattedEnd}
          </Text>
          <Text style={styles.userDetails}>Contact: {usermobileNumber}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={globalStyles.container}>
      <AppbarComponent
        title={`${parsedwing} ${parsedflatNumber} History`}
        source="Admin"
      />

      {oldMembers.length === 0 ? (
        <View style={styles.noMembersContainer}>
          <Text style={styles.noMembersText}>No member history found.</Text>
        </View>
      ) : (
        <FlatList
          data={oldMembers}
          renderItem={renderMemberHistory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    elevation: 1,
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  userDetails: {
    fontSize: 14,
    color: "#666",
  },
  noMembersContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  noMembersText: {
    fontSize: 16,
    color: "#999",
  },
});

export default FlatMemberHistory;
