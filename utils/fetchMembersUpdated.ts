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
}

export const fetchMembersUpdated = async (
  societyName: string
): Promise<Member[]> => {
  try {
    const customFlatsSubcollectionName = `${societyName} flats`;

    const tempMembers: Member[] = [];

    const flatsQuerySnapshot = await getDocs(
      collectionGroup(db, customFlatsSubcollectionName)
    );

    flatsQuerySnapshot.forEach((doc) => {
      const flatData = doc.data();

      // 🧠 Skip this flat if flatType is "dead"
      const flatType = flatData?.flatType?.toLowerCase();
      if (flatType === "dead") return;

      const flatId = doc.id;
      const flatPath = doc.ref.path;
      const pathSegments = flatPath.split("/");
      const wing = pathSegments[3];
      const floor = pathSegments[5];
      const userDetails = flatData.userDetails || {};

      // Filter approved users only
      let approvedUsers = Object.entries(userDetails).filter(
        ([, userInfo]: [string, any]) => userInfo.userStatus === "Approved"
      );

      // 🏠 If flatType is "rent", only include renter users
      if (flatType === "rent") {
        approvedUsers = approvedUsers.filter(
          ([, userInfo]: [string, any]) =>
            userInfo.userType?.toLowerCase() === "renter"
        );
      }

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
            value: `${wing} ${flatId}-${userId}`, // `${wing} ${flatId}-${userId}`
            floor,
            flatPath,
            userId, // ✅ Added userId
            userName,
            userType,
          });
        });
      } else {
        // No approved users
        tempMembers.push({
          label: `${wing} ${flatId}`,
          value: `${wing} ${flatId}`,
          floor,
          flatPath,
        });
      }
    });

    // Sort by Wing → Floor → Flat number
    // ✅ Sort by Wing → Floor → Numeric Flat Number
    // ✅ Sort by Wing → Floor (SB < G < 1 < 2...) → Flat Number
    const sortedMembers = tempMembers.sort((a, b) => {
      const aWing = a.label.split(" ")[0];
      const bWing = b.label.split(" ")[0];

      // 1️⃣ Sort by Wing alphabetically
      if (aWing < bWing) return -1;
      if (aWing > bWing) return 1;

      // 2️⃣ Helper to convert floor label into a comparable number
      const getFloorRank = (floor: string): number => {
        if (!floor) return 999; // fallback for undefined floors

        if (floor.toLowerCase() === "floor g") return 0; // Ground floor = 0

        const sbMatch = floor.match(/sb(\d+)/i); // e.g. "SB1" -> -1
        if (sbMatch) return -parseInt(sbMatch[1], 10);

        const upMatch = floor.match(/(\d+)/); // e.g. "Floor 1" -> 1
        if (upMatch) return parseInt(upMatch[1], 10);

        return 999; // Anything unrecognized goes last
      };

      const aFloorRank = getFloorRank(a.floor);
      const bFloorRank = getFloorRank(b.floor);

      if (aFloorRank < bFloorRank) return -1;
      if (aFloorRank > bFloorRank) return 1;

      // 3️⃣ Sort by flat number numerically
      const getFlatNumber = (val: string): number => {
        const match = val.match(/\b\d+\b/);
        return match ? parseInt(match[0], 10) : 0;
      };

      const aFlatNum = getFlatNumber(a.value);
      const bFlatNum = getFlatNumber(b.value);

      return aFlatNum - bFlatNum;
    });

    return sortedMembers;
  } catch (error) {
    console.error("Error fetching members:", error);
    throw error;
  }
};
