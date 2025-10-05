// financialYearHelpers.ts

// Helper function to calculate the Indian financial year dates
export const getCurrentFinancialYear = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
  
    if (currentMonth < 3) {
      return {
        startDate: `${currentYear - 1}-04-01`,
        endDate: `${currentYear}-03-31`,
      };
    } else {
      return {
        startDate: `${currentYear}-04-01`,
        endDate: `${currentYear + 1}-03-31`,
      };
    }
  };
  
  // Helper function to calculate previous financial years
  export const calculateFinancialYears = (currentYear: number, count: number) => {
    const financialYears = [];
    for (let i = 1; i <= count; i++) {
      const startYear = currentYear - i;
      const endYear = startYear + 1;
      financialYears.push({
        label: `FY: ${startYear}-${endYear.toString().slice(2)}`,
        start: `${startYear}-04-01`,
        end: `${endYear}-03-31`,
      });
    }
    return financialYears;
  };
  