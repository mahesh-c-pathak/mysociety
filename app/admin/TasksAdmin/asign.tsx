import { FlatList, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppbarComponent from "@/components/AppbarComponent";
import Dropdown from "@/utils/DropDown";
import { db } from "@/firebaseConfig";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useSociety } from "@/utils/SocietyContext";
import LoadingIndicator from "@/components/LoadingIndicator"; // new import
import { fetchMembersUpdated } from "@/utils/fetchMembersUpdated";
import DropdownMultiSelect from "@/utils/DropdownMultiSelect";
import { useRouter } from "expo-router";
import CustomButton from "@/components/CustomButton"; // reuse your button

interface Member {
  label: string;
  value: string;
  floor: string;
}

const Asign = () => {
  const { societyName } = useSociety();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [balancesheet, setBalancesheet] = useState("");
  const balancesheets = ["Main Balance"];

  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [selectedGateKeeper, setSelectedGateKeeper] = useState<string[]>([]);

  const [staffList, setStaffList] = useState<
    { label: string; value: string }[]
  >([]);

  const [gateKeeperList, setGateKeeperList] = useState<
    { label: string; value: string }[]
  >([]);

  const [fetchedmembers, setFetchedMembers] = useState<Member[]>([]);

  const [selectedfetchedMembers, setSelectedFetchedMembers] = useState<
    { floor: string; label: string; value: string }[]
  >([]);

  const [loading, setLoading] = useState(true);

  const customStaffCollectionName = `staff_${societyName}`;

  // ✅ Fetch staff from Firestore
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        const societyRef = `Societies/${societyName}`;
        const staffCollectionRef = collection(
          doc(db, societyRef),
          customStaffCollectionName
        );
        const snapshot = await getDocs(staffCollectionRef);

        const staffData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            label: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
            value: doc.id, // store docId as value for unique assignment
          };
        });

        setStaffList(staffData);

        // 🔹 Fetch gatekeepers
        const societyDocRef = doc(db, "Societies", societyName);
        const societyDocSnap = await getDoc(societyDocRef);

        if (societyDocSnap.exists()) {
          const societyData = societyDocSnap.data();
          const gateKeepers = societyData.gateKeepers || [];

          const gateKeeperData = gateKeepers.map((entry: any) => {
            const userId = Object.keys(entry)[0];
            const details = entry[userId];
            return {
              label: details.displayName || "Unnamed",
              value: userId,
            };
          });

          setGateKeeperList(gateKeeperData);

          // 🔹 Fetch members

          const fetchedMembers = await fetchMembersUpdated(societyName);
          setFetchedMembers(fetchedMembers);
        }
      } catch (error) {
        console.error("Error fetching staff:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [customStaffCollectionName, societyName]);

  const handleSaveAssign = () => {
    const assignData = {
      balancesheet,
      staff: staffList.filter((s) => selectedStaff.includes(s.value)), // {id,name}
      gatekeepers: gateKeeperList.filter((g) =>
        selectedGateKeeper.includes(g.value)
      ),
      members: selectedfetchedMembers, // already has name & id
    };

    // Pass assignData back
    router.push({
      pathname: "/admin/TasksAdmin/addTaskAdmin",
      params: { assignData: JSON.stringify(assignData) },
    });
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      <AppbarComponent title="Assign" source="Admin" />

      <FlatList
        data={[{}]} // Use a single-item list to render your UI
        renderItem={() => (
          <>
            {/* Admin */}
            <View style={styles.cardview}>
              <Text style={styles.label}>Admin</Text>
              <Dropdown
                data={balancesheets.map((option) => ({
                  label: option,
                  value: option,
                }))}
                onChange={(selectedValue) => {
                  setBalancesheet(selectedValue);
                }}
                placeholder="Select "
                initialValue={balancesheet}
              />
            </View>

            {/* Society Staff */}
            <View style={styles.cardview}>
              <Text style={styles.label}>Society Staff</Text>
              <DropdownMultiSelect
                options={staffList}
                selectedValues={selectedStaff}
                onChange={(values) => {
                  setSelectedStaff(values);
                  console.log("Staff selected:", values);
                }}
                placeholder="Select Staff"
              />
            </View>

            {/* Gatekeeper */}
            <View style={styles.cardview}>
              <Text style={styles.label}>Gatekeeper</Text>
              <DropdownMultiSelect
                options={gateKeeperList}
                selectedValues={selectedGateKeeper}
                onChange={(values) => {
                  setSelectedGateKeeper(values);
                  console.log("Gatekeepers selected:", values);
                }}
                placeholder="Select Gatekeeper"
              />
            </View>

            {/* Admin */}
            <View style={styles.cardview}>
              <Text style={styles.label}>Members</Text>
              <DropdownMultiSelect
                options={fetchedmembers}
                selectedValues={selectedfetchedMembers.map((m) => m.value)}
                onChange={(values) => {
                  const selected = fetchedmembers.filter((m) =>
                    values.includes(m.value)
                  );
                  setSelectedFetchedMembers(selected);
                }}
                placeholder="Select members"
              />
            </View>
          </>
        )}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: insets.bottom + 100 }, // 👈 extra space for footer + FAB
        ]}
      />
      {/* Save button */}
      <View style={[styles.footer, { bottom: insets.bottom }]}>
        <CustomButton title="Save" onPress={handleSaveAssign} />
      </View>
    </View>
  );
};

export default Asign;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: { padding: 16 },
  section: { marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  cardview: {
    marginBottom: 16,
    padding: 16,
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
});
