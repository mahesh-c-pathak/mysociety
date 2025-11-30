import * as logger from 'firebase-functions/logger';
import {onCall} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
/* ==========================================================
   UTILITY 1: Generate Bill Number (Transaction Safe)
========================================================== */
const reserveBillNumbers = async (
  societyName: string,
  count: number
): Promise<string[]> => {
  const counterRef = db
    .collection('Societies')
    .doc(societyName)
    .collection('Meta')
    .doc('billgenerationCounter');

  return await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(counterRef);

    let last = 0;

    if (!snap.exists) {
      // Create counter
      transaction.set(counterRef, {count});
    } else {
      last = snap.data()?.count || 0;
      transaction.update(counterRef, {
        count: admin.firestore.FieldValue.increment(count),
      });
    }

    // New bill numbers will be last+1 to last+count
    const start = last + 1;
    const end = last + count;

    // Financial year
    const currentYear = new Date().getFullYear();
    const nextYear = (currentYear + 1).toString().slice(-2);
    const financialYear = `${currentYear}-${nextYear}`;

    const billNumbers: string[] = [];
    for (let i = start; i <= end; i++) {
      billNumbers.push(`${societyName}-Bill No.INV-${financialYear}-${i}`);
    }

    return billNumbers;
  });
};

/*************************************************************
 * Utility 3: Run tasks in batches with concurrency
 *************************************************************/
const runBatches = async (
  taskFns: (() => Promise<any>)[],
  concurrency: number = 20
): Promise<any[]> => {
  const results: any[] = [];

  for (let i = 0; i < taskFns.length; i += concurrency) {
    const batch = taskFns.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }

  return results;
};

/*************************************************************
 * Utility 4: PRELOAD each flat (read only)
 *************************************************************/
const chunkArray = <T>(arr: T[], size: number): T[][] =>
  Array.from({length: Math.ceil(arr.length / size)}, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

const preloadFlatsBatch = async (
  selectedMembers: string[],
  commonBillData: any,
  parsedItems: any[],
  societyName: string,
  customWingsSubcollectionName: string,
  customFloorsSubcollectionName: string,
  customFlatsSubcollectionName: string,
  ownerBillAmount: string,
  rentBillAmount: string,
  closedBillAmount: string
) => {
  const refs: {
    ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
    member: string;
    floor: string;
    wing: string;
    flat: string;
  }[] = [];

  // Build all refs
  for (const member of selectedMembers) {
    const [floor, wing, flat] = member.split('-');
    const flatPath = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floor}/${customFlatsSubcollectionName}/${flat}`;
    refs.push({ref: db.doc(flatPath), member, floor, wing, flat});
  }

  const results: any[] = [];
  const CHUNK = 400;

  for (const batch of chunkArray(refs, CHUNK)) {
    const docRefs = batch.map((b) => b.ref);

    // 🔥 Single RPC for 400 flats
    const snaps = await db.getAll(...docRefs);

    for (let i = 0; i < snaps.length; i++) {
      try {
        const snap = snaps[i];
        const meta = batch[i];

        if (!snap.exists) {
          console.warn(`Flat ${meta.flat} not found: ${meta.member}`);
          results.push({ok: true, skipped: true, member: meta.member});
          continue;
        }

        const flatDetails = snap.data();
        const flatType = (flatDetails?.flatType || '').toString().toLowerCase();

        if (flatType === 'dead') {
          results.push({ok: true, skipped: true, member: meta.member});
          continue;
        }

        let amount = 0;
        if (flatType === 'owner') amount = Number(ownerBillAmount ?? 0);
        else if (flatType === 'rent') amount = Number(rentBillAmount ?? 0);
        else if (flatType === 'closed') amount = Number(closedBillAmount ?? 0);

        const billItemTotals: Map<string, number> = new Map();

        (parsedItems || []).forEach((item) => {
          let amt = 0;
          if (flatType === 'owner') amt = item.ownerAmount || 0;
          else if (flatType === 'rent') amt = item.rentAmount || 0;
          else if (flatType === 'closed') amt = item.closedUnitAmount || 0;

          const key = `${item.groupFrom}||${item.ledgerAccount}`;
          billItemTotals.set(key, (billItemTotals.get(key) || 0) + amt);
        });

        results.push({
          ok: true,
          skipped: false,
          member: meta.member,
          flat: meta.flat,
          floor: meta.floor,
          wing: meta.wing,
          flatPath: meta.ref.path,
          flatDetails,
          flatType,
          amount,
          commonBillData,
          billItemTotals,
        });
      } catch (err) {
        console.error('preload batch error:', err);
        results.push({ok: false, error: err});
      }
    }
  }

  return results;
};

/*************************************************************
 * Utility 5: Run preload phase using db.getAll batching
 *************************************************************/
const runPreloadPhase = async (
  selectedMembers: string[],
  commonBillData: any,
  parsedItems: any[],
  societyName: string,
  customWingsSubcollectionName: string,
  customFloorsSubcollectionName: string,
  customFlatsSubcollectionName: string,
  ownerBillAmount: string,
  rentBillAmount: string,
  closedBillAmount: string
) => {
  // 🔥 Single batched preload call
  const preloadResults = await preloadFlatsBatch(
    selectedMembers,
    commonBillData,
    parsedItems,
    societyName,
    customWingsSubcollectionName,
    customFloorsSubcollectionName,
    customFlatsSubcollectionName,
    ownerBillAmount,
    rentBillAmount,
    closedBillAmount
  );

  // 🔥 SAME OUTPUT FORMAT as before → NOTHING BREAKS
  const validPreloads = preloadResults.filter((r) => r && r.ok && !r.skipped);

  const skippedCount = preloadResults.filter((r) => r && r.skipped).length;

  const preloadErrors = preloadResults.filter((r) => r && r.ok === false);

  return {
    validPreloads,
    skippedCount,
    preloadErrors,
  };
};

/**
 * Generates a random 10-digit transaction ID.
 */
const generateTransactionId = (): string => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

const GenerateVoucherNumber = async (societyName: string): Promise<string> => {
  try {
    const counterRef = db
      .collection('Societies')
      .doc(societyName)
      .collection('Meta')
      .doc('transactionCounter');

    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(counterRef);

      let count = 1;
      if (!snap.exists) {
        tx.set(counterRef, {count: 1});
      } else {
        count = (snap.data()?.count || 0) + 1;
        tx.update(counterRef, {
          count: admin.firestore.FieldValue.increment(1),
        });
      }

      const currentYear = new Date().getFullYear();
      const nextYear = (currentYear + 1).toString().slice(-2);
      const financialYear = `${currentYear}-${nextYear}`;

      return `V/${financialYear}/${count}`;
    });
  } catch (err) {
    logger.error('Voucher number generation failed:', err);
    throw err;
  }
};

/*************************************************************
 * Utility X: Process One Flat (Per-flat writes)
 * CLEANED + SERVER-SAFE VERSION
 *************************************************************/

/**
 * processOneFlat Helper for Firebase Functions
 * --------------------------------------------------
 * - UNPAID phase now uses BulkWriter
 * - No logic modified
 * - No other changes
 */

interface PreloadResult {
  ok: boolean;
  skipped?: boolean;

  member: string;
  wing: string;
  floor: string;
  flat: string;

  flatPath: string;
  flatDetails: any;
  flatType: string;

  amount: number;
  commonBillData: any;
  billItemTotals: any;
}
const processOneFlat = async (
  preload: PreloadResult,
  societyName: string,
  customFlatsBillsSubcollectionName: string,
  receivableTotals: Map<string, number>,
  index: number,
  skippedCount: number,
  totalMembers: number,
  billNumber: string,
  masterBillId: string,
  bulkWriter: FirebaseFirestore.BulkWriter,
  dueDate: string,
  startDate: string,
  name: string,
  isEnablePenalty,
  invoiceDate: string,
  currentDate: string
) => {
  const {member, flatPath, amount, commonBillData, billItemTotals} = preload;

  try {
    const billData = {
      ...commonBillData,
      billNumber,
      members: member,
      flatPath,
    };

    const billItemLedger = Array.from(
      billItemTotals,
      ([key, amt]: [string, number]) => {
        const [groupFrom, ledgerAccount] = key.split('||');
        return {
          groupFrom,
          ledgerAccount,
          updatedLedgerAccount: `${ledgerAccount} Receivables`,
          amount: amt,
          invoiceDate: commonBillData.invoiceDate,
        };
      }
    );

    // ============================================================
    //            PAID PATH (with 3-attempt transaction)
    // ============================================================
    const paidAllowed = amount > 0; // zero bill never paid path
    let paidSuccess = false;

    if (paidAllowed) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Run one transaction per-paid flat. All reads/writes inside same tx.
          await db.runTransaction(async (tx) => {
            // Read flat master doc (contains totalBalance)
            const flatMasterRef = db.doc(flatPath);
            const flatSnap = await tx.get(flatMasterRef);
            const currentBalance = flatSnap.exists
              ? flatSnap.data()?.totalBalance || 0
              : 0;

            if (currentBalance < amount) {
              // insufficient balance => fall through to unpaid
              throw new Error('INSUFFICIENT_BALANCE');
            }

            // 🔥 Generate ONLY when balance is confirmed valid
            const transactionId = generateTransactionId();
            const voucherNumber = await GenerateVoucherNumber(societyName);

            const unclearedRef = db.doc(
              `${flatPath}/unclearedBalances/${transactionId}`
            );
            const flatBillRef = db.doc(
              `${flatPath}/${customFlatsBillsSubcollectionName}/${billNumber}`
            );
            const balanceRef = db.collection(`${flatPath}/flatCurrentBalance`);

            const billEntryPaid = {
              societyName,
              status: 'paid',
              amount,
              originalAmount: amount,
              dueDate,
              billType: 'Special Bill',
              startDate,
              name,
              isEnablePenalty,
              paymentDate: startDate,
              paymentMode: 'Wallet Auto',
              transactionId,
              voucherNumber,
              type: 'Bill Paid',
              origin: 'Bill Settlement',
              paidledgerAccount: 'Bank',
              paidledgerGroup: 'Bank Accounts',
              invoiceDate,
              masterBillId,
              billItemTotals: Object.fromEntries(billItemTotals || []),
            };

            // Step: write uncleared
            tx.set(unclearedRef, {
              amount,
              societyName,
              status: 'Cleared',
              amountReceived: amount,
              paymentReceivedDate: invoiceDate,
              paymentMode: 'Wallet Auto',
              transactionId,
              selectedIds: [billNumber],
              selectedBills: [billData],
              ledgerAccount: 'Bank',
              ledgerAccountGroup: 'Bank Accounts',
              voucherNumber,
              type: 'Bill Paid',
              origin: 'Bill Settlement',
            });

            // Step: update flat daily balance (use the balanceRef doc for date)
            // We compute daily and increment master totalBalance in the same transaction.
            const todayDocRef = balanceRef.doc(currentDate);
            const todaySnap = await tx.get(todayDocRef);

            const previousDaily = todaySnap.exists
              ? todaySnap.data()?.dailyChange || 0
              : 0;
            const newDaily = previousDaily - amount; // Subtract
            tx.set(
              todayDocRef,
              {dailyChange: newDaily, date: currentDate},
              {merge: true}
            );

            // Update master flat doc
            const lastUpdated = flatSnap.exists
              ? flatSnap.data()?.lastUpdatedAt || null
              : null;
            tx.set(
              flatMasterRef,
              {
                totalBalance: admin.firestore.FieldValue.increment(-amount),
                lastUpdatedAt:
                  !lastUpdated || currentDate > lastUpdated
                    ? currentDate
                    : lastUpdated,
              },
              {merge: true}
            );

            // Step: write the paid bill under flat bills
            tx.set(flatBillRef, billEntryPaid);
          });

          paidSuccess = true;
          break;
        } catch (err: any) {
          // If insufficient balance, do not retry further for this flat
          if (err?.message === 'INSUFFICIENT_BALANCE') {
            paidSuccess = false;
            break;
          }
          // Otherwise, allow up to 3 attempts for transient failures
          if (attempt === 3) paidSuccess = false;
          else continue;
        }
      }
    }

    // ============================================================
    //                     IF PAID SUCCESS
    // ============================================================
    if (paidSuccess) {
      return {
        membersAdvancedSubtract: amount,
        error: null,
      };
    }

    // ============================================================
    //                   UNPAID PATH (BulkWriter)
    // ============================================================
    const billEntryUnpaid = {
      societyName,
      status: 'unpaid',
      amount,
      originalAmount: amount,
      dueDate,
      billType: 'Special Bill',
      startDate,
      name,
      isEnablePenalty,
      invoiceDate,
      masterBillId,
      billItemTotals: Object.fromEntries(billItemTotals),
    };

    (billItemLedger || []).forEach((li) => {
      const ledger = li.updatedLedgerAccount || '';
      if (!ledger) return;
      receivableTotals.set(
        ledger,
        (receivableTotals.get(ledger) || 0) + (li.amount || 0)
      );
    });

    bulkWriter.set(
      db.doc(`${flatPath}/${customFlatsBillsSubcollectionName}/${billNumber}`),
      billEntryUnpaid
    );

    return {
      membersAdvancedSubtract: 0,
      error: null,
    };
  } catch (err) {
    return {
      error: {member: preload.member, err},
      membersAdvancedSubtract: 0,
    };
  }
};

/* ==========================================================
   UTILITY 6: Update Ledger Balance (Admin SDK)
========================================================== */
const updateLedger = async (
  societyName: string,
  ledgerGroup: string,
  ledgerAccount: string,
  amount: number,
  option: 'Add' | 'Subtract', // Accept only "Add" or "Subtract"
  date: string // Date in "YYYY-MM-DD"
): Promise<string> => {
  try {
    // Dynamic collections
    const ledgerGroupsCollectionName = `ledgerGroups_${societyName}`;
    const accountsCollectionName = `accounts_${societyName}`;
    const balancesCollectionName = `balances_${societyName}`;

    // References
    const accountRef = db
      .collection('Societies')
      .doc(societyName)
      .collection(ledgerGroupsCollectionName)
      .doc(ledgerGroup)
      .collection(accountsCollectionName)
      .doc(ledgerAccount);

    const todayRef = accountRef.collection(balancesCollectionName).doc(date);

    return await db.runTransaction(async (tx) => {
      /* ---------------------------------------------
         1️⃣ READ EVERYTHING FIRST
      ----------------------------------------------*/

      const todaySnap = await tx.get(todayRef);
      const masterSnap = await tx.get(accountRef);

      const oldDaily = todaySnap.exists
        ? todaySnap.data()?.dailyChange || 0
        : 0;

      const oldTotal = masterSnap.exists
        ? masterSnap.data()?.totalBalance || 0
        : 0;

      const lastUpdatedAt = masterSnap.exists
        ? masterSnap.data()?.lastUpdatedAt || null
        : null;

      /* ---------------------------------------------
         2️⃣ COMPUTE NEW VALUES
      ----------------------------------------------*/
      const change = option === 'Add' ? amount : -amount;

      const newDaily = oldDaily + change;

      // delta = finalDaily - previousDaily
      const delta = newDaily - oldDaily;

      const newTotal = oldTotal + delta;

      /* ---------------------------------------------
         3️⃣ WRITE UPDATED VALUES
      ----------------------------------------------*/
      tx.set(todayRef, {date, dailyChange: newDaily}, {merge: true});

      tx.set(
        accountRef,
        {
          totalBalance: newTotal,
          lastUpdatedAt:
            !lastUpdatedAt || date > lastUpdatedAt ? date : lastUpdatedAt,
        },
        {merge: true}
      );

      return 'Success';
    });
  } catch (error) {
    console.error('Error updating ledger:', error);
    throw error;
  }
};

/* ==========================================================
   UTILITY: Apply Aggregated Ledger Updates
========================================================== */
const applyAggregatedLedgerUpdates = async (
  societyName: string,
  itemLedgerTotals: Map<string, number>,
  receivableTotals: Map<string, number>,
  totalMembersAdvancedSubtract: number,
  currentDate: string
) => {
  const ledgerPromises: Promise<any>[] = [];

  // ---------------------------------------------------------
  // 1) Item-Level Ledger Totals
  // key = "groupFrom||ledgerAccount"
  // ---------------------------------------------------------
  for (const [key, amt] of itemLedgerTotals.entries()) {
    if (!amt) continue;

    const [groupFrom, ledgerAccount] = key.split('||');

    ledgerPromises.push(
      updateLedger(
        societyName,
        groupFrom,
        ledgerAccount,
        amt,
        'Add',
        currentDate
      )
    );
  }

  // ---------------------------------------------------------
  // 2) Receivables
  // ---------------------------------------------------------
  for (const [ledger, amt] of receivableTotals.entries()) {
    if (!amt) continue;

    ledgerPromises.push(
      updateLedger(
        societyName,
        'Account Receivable',
        ledger,
        amt,
        'Add',
        currentDate
      )
    );
  }

  // ---------------------------------------------------------
  // 3) Members Advanced (Paid Flats)
  // ---------------------------------------------------------
  if (totalMembersAdvancedSubtract > 0) {
    ledgerPromises.push(
      updateLedger(
        societyName,
        'Current Liabilities',
        'Members Advanced',
        totalMembersAdvancedSubtract,
        'Subtract',
        currentDate
      )
    );
  }

  await Promise.all(ledgerPromises);
};

const now = () => Date.now();

export const generatespecialbill = onCall(async (request) => {
  const functionStart = now();
  if (!request.auth) {
    logger.error('Unauthenticated access attempt');
    throw new Error('Authentication required to call this function.');
  }

  try {
    const data = request.data;
    // destructure inputs (same names as client)
    const {
      societyName,
      name,
      note,
      balancesheet,
      startDate,
      endDate,
      dueDate,
      invoiceDate,
      members,
      items,
      isEnablePenalty,
      Occurance,
      recurringFrequency,
      penaltyType,
      fixPricePenalty,
      percentPenalty,
      ledgerAccountPenalty,
      ledgerAccountGroupPenalty,
      userName,
      ownerBillAmount,
      rentBillAmount,
      closedBillAmount,
    } = data;

    if (!societyName) return {error: 'societyName is required'};
    // 🔥 constants for subcollection names (exact same strings)
    const customWingsSubcollectionName = `${societyName} wings`;
    const customFloorsSubcollectionName = `${societyName} floors`;
    const customFlatsSubcollectionName = `${societyName} flats`;
    const customFlatsBillsSubcollectionName = 'flatbills';
    const currentDate = new Date().toISOString().split('T')[0];

    // 🔥 parse items (client passes JSON string)
    let parsedItems: any[] = [];
    if (Array.isArray(items)) parsedItems = items;
    else if (typeof items === 'string' && items.length) {
      try {
        parsedItems = JSON.parse(items);
      } catch (err) {
        logger.error('Failed to parse items', err);
        return {error: 'Invalid items JSON'};
      }
    }

    // Extract members once
    const selectedMembers = members
      ? (members as string).split(',').map((m) => m.trim())
      : [];

    const commonBillData = {
      societyName,
      name,
      note,
      balancesheet,
      startDate,
      endDate,
      dueDate,
      invoiceDate,
      items: parsedItems,
      billType: 'Special Bill',
      isEnablePenalty,
      Occurance,
      recurringFrequency,
      penaltyType,
      fixPricePenalty,
      percentPenalty,
      ledgerAccountPenalty,
      ledgerAccountGroupPenalty,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: userName,
    };

    // ------------------------------------------
    // 🔥 RUN PRELOAD PHASE
    // ------------------------------------------
    const preloadStart = now();
    const {validPreloads, skippedCount, preloadErrors} = await runPreloadPhase(
      selectedMembers,
      commonBillData,
      parsedItems,
      societyName,
      customWingsSubcollectionName,
      customFloorsSubcollectionName,
      customFlatsSubcollectionName,
      ownerBillAmount,
      rentBillAmount,
      closedBillAmount
    );

    const preloadTime = now() - preloadStart;
    logger.info(`⏱ PRELOAD PHASE TOOK ${preloadTime} ms`);

    if (preloadErrors.length) {
      logger.warn('Some preload operations failed:', preloadErrors);
    }

    const allFlatPaths = validPreloads.map((p) => p.flatPath);

    // Sum of all flat bill amounts
    const totalBillAmount = validPreloads.reduce(
      (sum, flat) => sum + (flat.amount || 0),
      0
    );

    // Flats count
    const totalFlats = validPreloads.length;

    // PRE-GENERATE bill numbers
    const preGeneratedBillNumbers =
      totalFlats > 0 ? await reserveBillNumbers(societyName, totalFlats) : [];

    // ------------------------------------
    // Aggregation holders
    // ------------------------------------
    // Totals
    const itemLedgerTotals = new Map();
    const receivableTotals = new Map();
    let totalMembersAdvancedSubtract = 0;

    const errors: any[] = [];

    // Aggregate item ledger totals
    validPreloads.forEach((p) => {
      for (const [key, amt] of p.billItemTotals.entries()) {
        itemLedgerTotals.set(key, (itemLedgerTotals.get(key) || 0) + amt);
      }
    });

    // ----------------------------------
    // MASTER BILL ENTRY (ADMIN SDK)
    // ----------------------------------

    const masterBillData = {
      ...commonBillData,
      members,
      flatPaths: allFlatPaths,
      totalFlats: validPreloads.length,
      skippedFlats: skippedCount,
      billNumbers: preGeneratedBillNumbers,
      totalBillAmount,
      totalPaidAmount: totalMembersAdvancedSubtract,
    };

    // Create new doc with auto-id using Admin SDK
    const masterBillRef = db.collection('Bills').doc(); // <-- admin.firestore()

    await masterBillRef.set(masterBillData);

    const masterBillId = masterBillRef.id;

    // -----------------------------------------------------
    // 🔥 Phase B: Sequential per-flat writes
    // -----------------------------------------------------
    // BulkWriter for UNPAID bills
    const bulkWriter = db.bulkWriter();
    bulkWriter.onWriteError((error) => {
      console.error('BulkWriter write error:', error);
      // return false -> use default BulkWriter retry/backoff
      return false;
    });

    // Create per-flat task functions to process sequentially in batches (bounded concurrency)
    const flatTasks = validPreloads.map((preload, i) => {
      return () =>
        processOneFlat(
          preload,
          societyName,
          customFlatsBillsSubcollectionName,
          receivableTotals,
          i,
          skippedCount,
          selectedMembers.length,
          preGeneratedBillNumbers[i],
          masterBillId,
          bulkWriter,
          dueDate,
          startDate,
          name,
          isEnablePenalty,
          invoiceDate,
          currentDate
        );
    });

    // Run per-flat tasks with a safe concurrency (e.g., 30). Adjust per your environment.
    const batchStart = now();
    const perFlatResults = await runBatches(flatTasks, 30);
    const batchTime = now() - batchStart;
    logger.info(`⏱ PER-FLAT BATCH PROCESSING TOOK ${batchTime} ms`);

    perFlatResults.forEach((res: any) => {
      if (!res) return;
      if (res.error) errors.push(res.error);
      totalMembersAdvancedSubtract += res.membersAdvancedSubtract || 0;
    });

    await masterBillRef.update({totalPaidAmount: totalMembersAdvancedSubtract});

    // Ensure all bulkWriter ops are flushed and close it. Use finally to guarantee close.
    try {
      await bulkWriter.close();
    } catch (bwErr) {
      logger.error('BulkWriter close error', bwErr);
      errors.push({
        stage: 'bulkWriterClose',
        error: bwErr instanceof Error ? bwErr.message : bwErr,
      });
    }

    // ------------------------------------
    // Phase C: Apply Aggregated Ledger Updates
    // ------------------------------------
    const ledgerStart = now();

    try {
      await applyAggregatedLedgerUpdates(
        societyName,
        itemLedgerTotals,
        receivableTotals,
        totalMembersAdvancedSubtract,
        currentDate
      );

      logger.info('📘 Ledger totals updated successfully');
    } catch (ledgerErr) {
      logger.error('❌ Failed to update ledgers', ledgerErr);
      errors.push({
        stage: 'ledgerUpdate',
        error: ledgerErr instanceof Error ? ledgerErr.message : ledgerErr,
      });
    }
    const ledgerTime = now() - ledgerStart;
    logger.info(`⏱ LEDGER UPDATE PHASE TOOK ${ledgerTime} ms`);
    // ------------------------------------
    // Phase D: collect notifications
    // ------------------------------------
    const saveCommStart = now();
    await db
      .collection('Societies')
      .doc(societyName)
      .collection('Communications')
      .doc('pendingCommunication')
      .set(
        {
          jobs: [
            {
              masterBillId,
              name,
              createdAt: Date.now(),
            },
          ],
        },
        {merge: true} // <-- Keep this if you want to append instead of overwrite
      );

    const saveCommTime = now() - saveCommStart;
    logger.info(`⏱ SAVE COMMUNICATION PHASE TOOK ${saveCommTime} ms`);

    const totalTime = now() - functionStart;
    logger.info(`⏱ TOTAL FUNCTION TIME: ${totalTime} ms`, {
      preloadTime,
      batchTime,
      ledgerTime,
      saveCommTime,
      totalTime,
    });

    // ------------------------------------
    // FINAL RESPONSE TO EXPO APP
    // ------------------------------------
    return {
      success: true,
      message: 'Special bill generated successfully',
      processedFlats: validPreloads.length,
      skippedFlats: skippedCount,
      preloadErrors,
      errors,
    };
  } catch (err) {
    logger.error(`❌ Error generating bill for job :`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : err,
    };
  }
}); // end generatespecialbill
