import { Alert, StyleSheet, View } from "react-native";
import React, { useEffect, useState } from "react";
import AppbarComponent from "@/components/AppbarComponent";
import DropdownMultiSelect from "@/utils/DropdownMultiSelect";
import { fetchMembersUpdated } from "@/utils/fetchMembersUpdated";
import { useSociety } from "@/utils/SocietyContext";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import CustomButton from "@/components/CustomButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import LoadingIndicator from "@/components/LoadingIndicator"; // new import

export interface Member {
  label: string;
  value: string;
  floor: string;
  flatPath: string;
  userId?: string;
  userName?: string;
  userType?: string;
}

const AddFromSocietyMembers = () => {
  const { societyName } = useSociety();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [fetchedmembers, setFetchedMembers] = useState<Member[]>([]);
  const [selectedfetchedMembers, setSelectedFetchedMembers] = useState<
    Member[]
  >([]);

  const [admins, setAdmins] = useState<string[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);

  // 🔹 Fetch members
  useEffect(() => {
    // 🔹 Fetch existing admins
    const fetchAdmins = async () => {
      const societyRef = doc(db, "Societies", societyName);
      const societySnap = await getDoc(societyRef);
      if (societySnap.exists()) {
        const data = societySnap.data();
        setAdmins(data.admins || []);
      }
    };
    const loadMembers = async () => {
      try {
        setLoading(true);
        await fetchAdmins();
        const members = await fetchMembersUpdated(societyName);
        setFetchedMembers(members);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadMembers();
  }, [societyName]);

  // 🔹 Filter only non-admin members
  useEffect(() => {
    const nonAdminMembers = fetchedmembers.filter(
      (m) => m.userId && !admins.includes(m.userId)
    );
    setFilteredMembers(nonAdminMembers);
  }, [fetchedmembers, admins]);

  useEffect(() => {
    if (selectedfetchedMembers.length > 0) {
      const selectedUserIds = selectedfetchedMembers
        .map((item) => item.userId)
        .filter((id) => id); // removes undefined values

      // ✅ Remove duplicates using Set
      const uniqueData = Array.from(new Set(selectedUserIds));

      console.log("Selected User IDs:", uniqueData);
    }
  }, [selectedfetchedMembers]);

  // 🔹 Handle Save button press
  const handleSave = async () => {
    if (selectedfetchedMembers.length === 0) {
      Alert.alert(
        "Select Members",
        "Please select at least one member to assign as Admin."
      );
      return;
    }

    try {
      const selectedUserIds = selectedfetchedMembers
        .map((m) => m.userId)
        .filter((id) => id !== undefined);

      const societyRef = doc(db, "Societies", societyName);

      // Update each selected user's role & add to society admin array
      for (const userId of selectedUserIds) {
        if (!userId) continue;

        setLoading(true);
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          let updatedMySociety = userData.mySociety || [];

          // 🔍 Find if this society already exists in the user's mySociety array
          const existingEntryIndex = updatedMySociety.findIndex(
            (entry: any) => Object.keys(entry)[0] === societyName
          );

          if (existingEntryIndex !== -1) {
            // ✅ Society already exists → merge roles safely
            const existingSociety =
              updatedMySociety[existingEntryIndex][societyName];
            const existingRoles = existingSociety.memberRole || [];

            const mergedRoles = Array.from(
              new Set([...existingRoles, "Admin"])
            );

            // ✅ Preserve all other fields under the same society
            updatedMySociety[existingEntryIndex][societyName] = {
              ...existingSociety,
              memberRole: mergedRoles,
            };
          } else {
            // 🆕 Society doesn’t exist → add a new one
            updatedMySociety.push({
              [societyName]: { memberRole: ["Admin"] },
            });
          }

          // ✅ Update merged array (preserves other user fields)
          await updateDoc(userRef, { mySociety: updatedMySociety });
        }

        // Add to admins array if not already there
        await updateDoc(societyRef, {
          admins: arrayUnion(userId),
        });
      }

      // Show success alert and navigate back
      Alert.alert("Success", "Selected members are now Admins!", [
        {
          text: "OK",
          onPress: () =>
            router.push({
              pathname: `/admin/AssignAdminRole`,
              params: {},
            }), // Navigate to index screen in the previous folder
        },
      ]);
    } catch (error) {
      console.error("Error assigning Admin role:", error);
      Alert.alert("Error", "Failed to assign Admin role.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      {/* Appbar Component */}
      <AppbarComponent title="Add Admin" source="Admin" />
      <View style={styles.cardview}>
        {/* Select Members */}
        <View style={styles.section}>
          <DropdownMultiSelect
            options={filteredMembers}
            selectedValues={selectedfetchedMembers.map((m) => m.value)}
            onChange={(values) => {
              const selected = filteredMembers.filter((m) =>
                values.includes(m.value)
              );
              setSelectedFetchedMembers(selected);
            }}
            placeholder="Select members to make Admin"
          />
        </View>
      </View>
      <View style={[styles.footer, { bottom: insets.bottom }]}>
        <CustomButton
          title="Save"
          onPress={handleSave}
          style={styles.saveButton}
        />
      </View>
    </View>
  );
};

export default AddFromSocietyMembers;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  section: { marginBottom: 10 },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
    flexShrink: 1, // Prevents text from pushing the switch
  },
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
    bottom: 20,
    width: "100%",
    alignItems: "center",
  },
  saveButton: {
    width: "90%",
    borderRadius: 12,
    backgroundColor: "#2196F3",
  },
});
