// utils/fetchBankCahBalances.ts
import {
  fetchBalanceForDate,
  fetchLatestBalanceBeforeDate,
} from "@/utils/fetchbalancefromdatabase";
import { fetchbankCashAccountOptions } from "@/utils/bankCashOptionsFetcher";

/**
 * Fetch opening and closing balances for bank and cash accounts.
 * If ledgerAccount is provided, fetch only that account.
 *
 * @param societyName - The society name (Firestore identifier)
 * @param fromDateStr - From date string (e.g. "2025-01-01")
 * @param toDateStr - To date string (e.g. "2025-01-31")
 * @param ledgerAccount - (Optional) specific ledger account label to fetch
 * @returns Array of account balances: { label, group, opening, closing }
 */
export async function fetchBankCahBalances(
  societyName: string,
  fromDateStr: string,
  toDateStr: string,
  ledgerAccount?: string
) {
  // 1️⃣ Fetch available bank/cash accounts
  const { accountFromOptions } = await fetchbankCashAccountOptions(societyName);

  // 2️⃣ Filter for Bank & Cash groups
  let filteredAccounts = accountFromOptions.filter(
    (opt) => opt.group === "Bank Accounts" || opt.group === "Cash in Hand"
  );

  // 3️⃣ If specific ledgerAccount is provided, narrow down
  if (ledgerAccount) {
    filteredAccounts = filteredAccounts.filter(
      (opt) => opt.label === ledgerAccount
    );
  }

  // 4️⃣ Fetch balances for each account in parallel
  const balancesPromises = filteredAccounts.map(async (account) => {
    const opening = await fetchLatestBalanceBeforeDate(
      societyName,
      account.group,
      account.label,
      fromDateStr
    );

    let closing = await fetchBalanceForDate(
      societyName,
      account.group,
      account.label,
      toDateStr
    );

    if (closing === 0) {
      // fallback if no exact match found
      closing = await fetchLatestBalanceBeforeDate(
        societyName,
        account.group,
        account.label,
        toDateStr
      );
    }

    return {
      label: account.label,
      group: account.group,
      opening,
      closing,
    };
  });

  // 5️⃣ Resolve all promises in parallel
  const balances = await Promise.all(balancesPromises);

  return balances;
}
