import { collectionGroup, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";

export interface Member {
  label: string;
  value: string;
  floor: string;
}

export const fetchMembersUpdated = async (societyName: string): Promise<Member[]> => {
  try {
    const customFlatsSubcollectionName = `${societyName} flats`;

    const tempMembers: {
      wing: string;
      flat: string;
      floor: string;
      label: string;
      value: string;
    }[] = [];

    const flatsQuerySnapshot = await getDocs(collectionGroup(db, customFlatsSubcollectionName));

    flatsQuerySnapshot.forEach((doc) => {
      const flatId = doc.id;
      const flatPath = doc.ref.path;
      const pathSegments = flatPath.split("/");
      const wing = pathSegments[3];
      const floor = pathSegments[5];

      tempMembers.push({
        wing,
        flat: flatId,
        floor, // Keep as string for now
        label: `${wing} ${flatId}`,
        value: `${wing} ${flatId}`,
      });
    });

    // Sort and format the member list
    const sortedMembers = tempMembers.sort((a, b) => {
      if (a.wing < b.wing) return -1;
      if (a.wing > b.wing) return 1;
      if (parseInt(a.floor) < parseInt(b.floor)) return -1; // Convert to number for comparison
      if (parseInt(a.floor) > parseInt(b.floor)) return 1;
      return a.flat.localeCompare(b.flat); // Compare flat IDs as strings
    });

    return sortedMembers.map((member) => ({
      label: member.label,
      value: member.value,
      floor: member.floor, // Keep as string
    }));
  } catch (error) {
    console.error("Error fetching members:", error);
    throw error;
  }
};
