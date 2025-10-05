// utils/dateFormatter.ts

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
  