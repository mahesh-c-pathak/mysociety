// utils/dateFormatter.ts
import { Timestamp } from "firebase/firestore";

// Function to format date as "01 Jan 2025"
export const formatDateIntl = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

// Function to format date as "YYYY-MM-DD"
export const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};

/**
 * Returns Firestore Timestamps for start and end of today in IST
 */
export const todayISTRange = (): {
  startTimestampToday: Timestamp;
  endTimestampToday: Timestamp;
} => {
  const now = new Date();

  // Convert local time to IST string, then back to Date
  const nowIST = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  // Start of today in IST
  const startIST = new Date(
    nowIST.getFullYear(),
    nowIST.getMonth(),
    nowIST.getDate(),
    0,
    0,
    0,
    0
  );

  // End of today in IST
  const endIST = new Date(
    nowIST.getFullYear(),
    nowIST.getMonth(),
    nowIST.getDate(),
    23,
    59,
    59,
    999
  );

  return {
    startTimestampToday: Timestamp.fromDate(startIST),
    endTimestampToday: Timestamp.fromDate(endIST),
  };
};

/**
 * Returns Firestore Timestamp for current time in IST
 */
export const nowISTtimestamp = (): Timestamp => {
  const now = new Date();

  // IST offset is +5:30
  const offset = 5.5 * 60; // minutes
  const utc = now.getTime() + now.getTimezoneOffset() * 60000; // convert to UTC
  const istTime = new Date(utc + offset * 60000);

  return Timestamp.fromDate(istTime);
};

/**
 * to convert any JS Date → Firestore Timestamp in IST
 */
