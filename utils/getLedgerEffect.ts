/**
 * Determines how a ledger account should be affected (Add or Subtract)
 * based on its group and whether it's on the Credit or Debit side.
 *
 * @param groupName The ledger group name (e.g., "Bank Accounts", "Direct Income")
 * @param isCreditSide true if this account is on the Credit side (Cr), false if on the Debit side (Dr)
 * @returns "Add" or "Subtract"
 */
export const useLedgerEffect = () => {
  const getLedgerEffect = (
    groupName: string,
    isCreditSide: boolean
  ): "Add" | "Subtract" => {
    const liabilityCategories = [
      "Account Payable",
      "Capital Account",
      "Current Liabilities",
      "Deposit",
      "Loan and Advances",
      "Provision",
      "Reserve and Surplus",
      "Share Capital",
      "Sundry Creditors",
      "Suspense Account",
      "Income & Expenditure Account",
    ];

    const assetCategories = [
      "Account Receivable",
      "Bank Accounts",
      "Cash in Hand",
      "Current Assets",
      "Fixed Assets",
      "Investment",
      "Sundry Debtors",
    ];

    const bankCashCategories = ["Bank Accounts", "Cash in Hand"];

    const incomeCategories = ["Direct Income", "Indirect Income"];

    const expenditureCategories = [
      "Direct Expenses",
      "Indirect Expenses",
      "Maintenance & Repairing",
    ];

    // 🟢 Special case for Bank/Cash → decrease on Paid From, increase on Paid To
    if (bankCashCategories.includes(groupName)) {
      return isCreditSide ? "Add" : "Subtract";
      // Note: When calling this function, pass isCreditSide = true for Paid To, false for Paid From
    }

    // 🟢 Assets → Increase on Debit, Decrease on Credit
    if (assetCategories.includes(groupName)) {
      return isCreditSide ? "Subtract" : "Add";
    }

    // 🔵 Liabilities → Increase on Credit, Decrease on Debit
    if (liabilityCategories.includes(groupName)) {
      return isCreditSide ? "Add" : "Subtract";
    }

    // 🟣 Income → Increase on Credit, Decrease on Debit
    if (incomeCategories.includes(groupName)) {
      return isCreditSide ? "Add" : "Subtract";
    }

    // 🔴 Expenses → Increase on Debit, Decrease on Credit
    if (expenditureCategories.includes(groupName)) {
      return isCreditSide ? "Subtract" : "Add";
    }

    // 🟠 Default safeguard (if group not found)
    console.log("Using Default safeguard - ADD ( group not found)");
    return "Add";
  };

  return { getLedgerEffect };
};
