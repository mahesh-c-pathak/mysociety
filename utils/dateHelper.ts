// utils/dateHelper.ts (add this function)
import { fromZonedTime } from "date-fns-tz";

const timeZone = "Asia/Kolkata";

/**
 * Convert two IST dates (YYYY-MM-DD) into UTC start & end range
 * For Firestore queries between those dates (inclusive)
 */
export const getISTDateRange = (startDate: string, endDate: string) => {
  const startIST = new Date(`${startDate}T00:00:00`);
  const endIST = new Date(`${endDate}T23:59:59`);

  const startUTC = fromZonedTime(startIST, timeZone);
  const endUTC = fromZonedTime(endIST, timeZone);

  return { startUTC, endUTC };
};
