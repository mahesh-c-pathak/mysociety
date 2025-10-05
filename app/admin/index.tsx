import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Appbar, Button, IconButton, Card } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSociety } from "@/utils/SocietyContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { logout } from "@/authService"; // ✅ central auth functions
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";
import { DrawerActions, useNavigation } from "@react-navigation/native";

interface DashboardItem {
  label: string;
  icon: string;
  route?: string;
  params?: object;
}

export default function AdminHome() {
  const navigation = useNavigation();
  useCustomBackHandler("/setupsociety"); // back always goes to Screen3
  const router = useRouter();
  const { societyName: societyNameParam } = useLocalSearchParams();
  const { societyName, setSocietyName } = useSociety();

  useEffect(() => {
    if (societyNameParam) {
      setSocietyName(societyNameParam as string); // Update context value
    }
  }, [societyNameParam, setSocietyName]);

  const [societyCode, setSocietyCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSocietyCode = async () => {
      try {
        if (societyNameParam) {
          const societyDocRef = doc(
            db,
            "Societies",
            societyNameParam as string
          );
          const societyDocSnap = await getDoc(societyDocRef);

          if (societyDocSnap.exists()) {
            setSocietyCode(societyDocSnap.data().societycode);
          } else {
            setSocietyCode("Not Found");
          }
        }
      } catch (error) {
        console.error("Error fetching society code:", error);
        setSocietyCode("Error");
      } finally {
        setLoading(false);
      }
    };

    fetchSocietyCode();
  }, [societyNameParam]);

  const renderGrid = (items: DashboardItem[]) => (
    <View style={styles.grid}>
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.gridItem}
          onPress={() => {
            if (item.route) {
              // Check if params exist and include them in the navigation
              // const params = item.params || {};
              //router.push({ pathname: item.route, params }); // Navigate to the respective screen
              router.push(item.route as any); // safe cast if TypeScript complains
            }
          }}
        >
          <IconButton icon={item.icon} size={30} />
          <Text style={styles.gridLabel}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const handleFirebaseLogout = async () => {
    try {
      await logout(); // ✅ use wrapper
    } catch (err: any) {
      Alert.alert("Logout Failed", err.message);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#5e35b1" />;
  }

  const quickAccess = [
    { label: "Bills", icon: "file-document", route: "/admin/Bills" },
    { label: "Collection", icon: "cart", route: "/admin/Collection" },
    { label: "Accounting", icon: "book-account", route: "/admin/Accounting" },
    { label: "PhonePe", icon: "book-account", route: "/admin/phonepe" },
    { label: "Terms", icon: "book-account", route: "/terms" },
    { label: "privacy-policy", icon: "book-account", route: "/privacypolicy" },
    {
      label: "Pushnotifications",
      icon: "book-account",
      route: "/admin/Pushnotifications",
    },
    {
      label: "Imagekitupload",
      icon: "book-account",
      route: "/admin/Imagekitupload",
    },
    { label: "Fileupload", icon: "book-account", route: "/admin/Fileupload" },

    { label: "AdminHome", icon: "book-account", route: "/admin/AdminHome" },

    {
      label: "ImageKitFileDetails",
      icon: "book-account",
      route: "/admin/ImageKitFileDetails",
    },

    {
      label: "Complains",
      icon: "note-edit",
      route: "/admin/Complainsadmin/ComplainTypesAdmin",
    },
  ];

  const directoryItems = [
    { label: "Members", icon: "account-group", route: "/admin/Managemembers" },
    { label: "Vehicles", icon: "car", route: "/admin/Vehicles?source=Admin" },
    { label: "Emergency", icon: "phone" },
    {
      label: "Staff",
      icon: "account-tie",
      route: "/admin//StafAdmin?source=Admin",
    },
    { label: "Admin", icon: "shield-account" },
    { label: "Permission", icon: "lock", route: "" },
    { label: "Statistics", icon: "chart-bar" },
  ];

  const interactionItems = [
    { label: "Meeting", icon: "calendar-clock" },
    { label: "Announcements", icon: "bullhorn", route: "/(Announcements)" },
    { label: "Event", icon: "calendar" },
    { label: "Voting", icon: "thumb-up" },
    { label: "Resources", icon: "file" },
    { label: "Proposal", icon: "book-open-outline" },
    { label: "Suggestions", icon: "lightbulb" },
    {
      label: "Tasks",
      icon: "clipboard-check",
      route: "/admin/TasksAdmin/TaskTypesAdmin",
    },
  ];

  const gateKeeperItems = [
    {
      label: "Gate Keepers",
      icon: "account-tie",
      route: "/admin/GateKeeperAdmin",
    },
    { label: "Gates", icon: "gate" },
    { label: "GatePass", icon: "card-account-details" },
    {
      label: "Daily Helper",
      icon: "account-hard-hat",
      route: "/admin/DailyHelper",
    },
    {
      label: "Visitor Statistics and History",
      icon: "history",
      route: "/(GateKeeperAdmin)/VisitorStats",
    },
  ];

  return (
    <View style={styles.container}>
      {/* Top Appbar */}
      <Appbar.Header>
        <Appbar.Action
          icon="menu"
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
        <Appbar.Content title={societyName} />
        <IconButton icon="bell" onPress={() => {}} />
      </Appbar.Header>
      {/* Logout Button */}
      <Button mode="contained" onPress={handleFirebaseLogout}>
        Logout
      </Button>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Subscription Section */}
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.remainingText}>6 Days remaining</Text>
            <Button mode="text" onPress={() => {}}>
              View Services
            </Button>
          </View>
        </Card>

        {/* Share Code Section */}
        <Card style={styles.card}>
          <Text style={styles.codeText}>{societyCode}</Text>
          <Text style={styles.description}>
            Click here to share code with building members to join Saiseva Hsg.
          </Text>
          <IconButton
            icon="share"
            style={styles.shareIcon}
            onPress={() => {}}
          />
        </Card>

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
          <Text style={styles.sectionTitle}>Gate Keeper</Text>
          {renderGrid(gateKeeperItems)}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  appBar: {
    backgroundColor: "#5e35b1",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  remainingText: {
    fontSize: 16,
    fontWeight: "600",
  },
  codeText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    textAlign: "center",
    color: "#555",
    marginBottom: 8,
  },
  shareIcon: {
    alignSelf: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 8,
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
});
