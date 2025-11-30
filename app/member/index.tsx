import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { Appbar, IconButton, Card, Badge } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";

import { db } from "@/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { useSociety } from "@/utils/SocietyContext";
import { useAuthRole } from "@/lib/authRole";
import { useNotification } from "@/context/NotificationContext"; // ✅ current token
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";

const Index = () => {
  const { user } = useAuthRole();
  const router = useRouter();
  const { expoPushToken, nativeToken } = useNotification();
  const {
    societyName: societyNameParam,
    wing: wingParam,
    floorName: floorNameParam,
    flatNumber: flatNumberParam,
    userType: userTypeParam,
  } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  useCustomBackHandler("/setupsociety"); // back always goes to Screen3

  const {
    societyName,
    wing,
    floorName,
    flatNumber,
    userType,
    setSocietyName,
    setWing,
    setFloorName,
    setFlatNumber,
    setUserType,
  } = useSociety();

  useEffect(() => {
    if (societyNameParam) setSocietyName(societyNameParam as string);
    if (wingParam) setWing(wingParam as string);
    if (floorNameParam) setFloorName(floorNameParam as string);
    if (flatNumberParam) setFlatNumber(flatNumberParam as string);
    if (userTypeParam) setUserType(userTypeParam as string);
  }, [societyNameParam, wingParam, flatNumberParam, userTypeParam]);

  // const customFlatsBillsSubcollectionName = `${societyName} bills`;
  const customFlatsBillsSubcollectionName = "flatbills";

  const [unpaidCount, setUnpaidCount] = useState(0); // ✅ For badge

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return; // ⬅️ exit if user is null
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userInfo = userSnap.data();
          setUserData(userInfo);

          const roles = userInfo.memberRole || [];
          const types = userInfo.memberType || [];
          const allPermissions: Set<string> = new Set();

          for (const role of roles) {
            const roleRef = doc(db, "Roles", role);
            const roleSnap = await getDoc(roleRef);

            if (roleSnap.exists()) {
              const roleData = roleSnap.data();
              for (const type of types) {
                if (roleData[type]) {
                  Object.values(roleData[type]).forEach((value) => {
                    const items = value as string[];
                    items.forEach((item) => allPermissions.add(item));
                  });
                }
              }
            }
          }

          setPermissions(Array.from(allPermissions));
        } else {
          alert("User does not exist!");
        }
      } catch (error) {
        console.error("Error fetching user data or roles:", error);
        alert("Failed to fetch data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // 🔥 Save both Expo and Native push tokens
  useEffect(() => {
    const syncPushToken = async () => {
      if (!user || !societyName || !wing || !floorName || !flatNumber) return;
      if (!expoPushToken && !nativeToken) return; // nothing to save yet

      try {
        const flatRef = doc(
          db,
          "Societies",
          societyName,
          `${societyName} wings`,
          wing,
          `${societyName} floors`,
          floorName,
          `${societyName} flats`,
          flatNumber
        );

        const flatSnap = await getDoc(flatRef);
        if (!flatSnap.exists()) return;

        const flatData = flatSnap.data();
        const currentDetails = flatData.userDetails || {};
        const userEntry = currentDetails[user.uid] || {};

        const savedExpoTokens: string[] = userEntry.expoPushTokens || [];
        const savedNativeTokens: string[] = userEntry.nativeTokens || [];

        // Only add new tokens if not already stored
        const updatedExpoTokens =
          expoPushToken && !savedExpoTokens.includes(expoPushToken)
            ? [...savedExpoTokens, expoPushToken]
            : savedExpoTokens;

        const updatedNativeTokens =
          nativeToken && !savedNativeTokens.includes(nativeToken)
            ? [...savedNativeTokens, nativeToken]
            : savedNativeTokens;

        const updatedDetails = {
          ...currentDetails,
          [user.uid]: {
            ...userEntry,
            expoPushTokens: updatedExpoTokens,
            nativeTokens: updatedNativeTokens,
          },
        };

        await updateDoc(flatRef, { userDetails: updatedDetails });

        // set unpaid bill count
        const billsCollectionRef = collection(
          flatRef,
          customFlatsBillsSubcollectionName
        );
        const billsSnapshot = await getDocs(billsCollectionRef);

        let unpaid = 0;
        billsSnapshot.forEach((billDoc) => {
          const bill = billDoc.data();
          if (bill.status !== "paid") unpaid++;
        });

        setUnpaidCount(unpaid);

        console.log("✅ Tokens synced to Firestore:", {
          expoPushToken,
          nativeToken,
        });
      } catch (err) {
        console.error("Error syncing push tokens:", err);
      }
    };

    syncPushToken();
  }, [
    user,
    societyName,
    wing,
    floorName,
    flatNumber,
    expoPushToken,
    nativeToken,
    customFlatsBillsSubcollectionName,
  ]);

  const quickAccess = [
    {
      label: "My Bills",
      icon: "file-document",
      route: "/member/myBill?source=Member",
      showBadge: true, // ✅ mark the one that needs badge
    },
    // { label: "Member Dues", icon: "cart" },
    // { label: "user FUnds", icon: "book-account", route: "/(accounting)" },
    {
      label: "Complains",
      icon: "note-edit",
      route: "/member/Complains/ComplainTypes?source=Member",
    },
  ];

  const directoryItems = [
    { label: "Members", icon: "account-group", route: "/(Members)" },
    {
      label: "Vehicles",
      icon: "car",
      route: "/member/myVehicles?source=Member",
    },
    { label: "Emergency", icon: "phone" },
    {
      label: "Society Staff",
      icon: "account-tie",
      route: "/member/SocietyStaff?source=Member",
    },
  ];

  const interactionItems = [
    // { label: "Meeting", icon: "calendar-clock", permission: "Society Meeting" },
    {
      label: "Announcements",
      icon: "bullhorn",
      // permission: "Announcements",
      route: "/(AnnouncementsMember)?source=Member",
    },
    // { label: "Event", icon: "calendar", permission: "Event" },
    // { label: "Voting", icon: "thumb-up", permission: "Voting" },
    {
      label: "Society Resources",
      icon: "file",
      permission: "Society Resources",
    },
    // { label: "Proposal", icon: "book-open-outline", permission: "Proposal" },
    // { label: "Suggestions", icon: "lightbulb", permission: "Suggestion" },
    {
      label: "Tasks",
      icon: "clipboard-check",
      route:
        "/member/TasksMember/TaskTypesMember/OpenTasksMember?source=Member",
    },
  ];

  const gateKeeperItems = [
    {
      label: "My Visitor",
      icon: "gate",
      route: "/member/MyVisitors?source=Member",
    },
    {
      label: "My Daily Helper",
      icon: "account-hard-hat",
      route: "/member/myDailyHelper?source=Member",
    },
    { label: "Gate Keepers", icon: "account-tie" },
    {
      label: "GatePass",
      icon: "card-account-details",
      route: "/member/GatePassMember?source=Member",
    },
    { label: "Settings", icon: "history" },
  ];

  // Conditionally render "Tasks" card if permission exists
  const renderGrid = (items: any) => (
    <View style={styles.grid}>
      {items.map((item: any, index: any) => {
        if (item.permission && !permissions.includes(item.permission)) {
          return null;
        }
        return (
          <TouchableOpacity
            key={index}
            style={styles.gridItem}
            onPress={() => {
              if (item.route) {
                const params = item.params || {};
                router.push({ pathname: item.route, params });
              }
            }}
          >
            <View>
              <IconButton icon={item.icon} size={30} />
              {/* ✅ Badge on My Bills */}
              {item.showBadge && unpaidCount > 0 && (
                <Badge style={styles.badge}>{unpaidCount}</Badge>
              )}
            </View>
            <Text style={styles.gridLabel}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Appbar */}
      <StatusBar backgroundColor="#2196F3" barStyle="light-content" />

      <Appbar.Header style={[styles.header, { backgroundColor: "#2196F3" }]}>
        <Appbar.Action icon="menu" onPress={() => {}} color="#fff" />
        <Appbar.Content
          title={`${wing || "-"} ${floorName || "-"} Flat: ${
            flatNumber || "-"
          }`}
          titleStyle={styles.titleStyle}
        />
        <Appbar.Action icon="bell" onPress={() => {}} color="#fff" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quick Access Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          {renderGrid(quickAccess)}
        </Card>

        {/* Directory Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Directory</Text>
          {renderGrid(directoryItems)}
        </Card>

        {/* Interaction Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Interaction</Text>
          {renderGrid(interactionItems)}
        </Card>

        {/* Gate Keeper Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Visitor</Text>
          {renderGrid(gateKeeperItems)}
        </Card>
      </ScrollView>
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: { backgroundColor: "#2196F3" },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  scrollContent: {
    padding: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: "23%",
    alignItems: "center",
    marginVertical: 8,
  },
  sectionCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  gridLabel: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 8,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "red",
    color: "white",
  },
});
