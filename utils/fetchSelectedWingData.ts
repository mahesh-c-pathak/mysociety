import { collectionGroup, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";

export interface Member {
  label: string;
  value: string;
  floor: string;
  flatPath: string;
  userId?: string;
  userName?: string;
  userType?: string;
  flatType?: string;
}

/**
 * Fetch members only for selected wings (using same structure as fetchMembersUpdated)
 */
export const fetchSelectedWingData = async (
  societyName: string,
  selectedWings: string[]
): Promise<Member[]> => {
  try {
    if (!selectedWings || selectedWings.length === 0) return [];

    const customFlatsSubcollectionName = `${societyName} flats`;
    const tempMembers: Member[] = [];

    // Fetch all flats across all wings
    const flatsQuerySnapshot = await getDocs(
      collectionGroup(db, customFlatsSubcollectionName)
    );

    flatsQuerySnapshot.forEach((doc) => {
      const flatPath = doc.ref.path; // e.g. Societies/MySociety/wings/A/floors/1/MySociety flats/101
      const pathSegments = flatPath.split("/");
      const wing = pathSegments[3];
      const floor = pathSegments[5];

      // Only include if this wing is in selectedWings
      if (!selectedWings.includes(wing)) return;

      const flatId = doc.id;
      const flatData = doc.data();
      const flatType = flatData.flatType;
      const userDetails = flatData.userDetails || {};

      // Filter approved users
      const approvedUsers = Object.entries(userDetails).filter(
        ([, userInfo]: [string, any]) => userInfo.userStatus === "Approved"
      );

      if (approvedUsers.length > 0) {
        approvedUsers.forEach(([userId, userInfo]: [string, any]) => {
          const userName = userInfo.userName || "";
          const userType = userInfo.userType || "";
          const labelSuffix =
            userName && userType
              ? ` (${userName} - ${userType})`
              : userName
                ? ` (${userName})`
                : "";

          tempMembers.push({
            label: `${wing} ${flatId}${labelSuffix}`,
            value: `${wing} ${flatId}-${userId}`,
            floor,
            flatPath,
            userId,
            userName,
            userType,
            flatType,
          });
        });
      } else {
        // No approved users
        tempMembers.push({
          label: `${wing} ${flatId}`,
          value: `${wing} ${flatId}`,
          floor,
          flatPath,
          flatType,
        });
      }
    });

    // Sort by Wing → Floor → Flat number
    const sortedMembers = tempMembers.sort((a, b) => {
      const aWing = a.label.split(" ")[0];
      const bWing = b.label.split(" ")[0];
      if (aWing < bWing) return -1;
      if (aWing > bWing) return 1;
      if (parseInt(a.floor) < parseInt(b.floor)) return -1;
      if (parseInt(a.floor) > parseInt(b.floor)) return 1;
      return a.value.localeCompare(b.value);
    });

    return sortedMembers;
  } catch (error) {
    console.error("Error fetching selected wings members:", error);
    throw error;
  }
};
