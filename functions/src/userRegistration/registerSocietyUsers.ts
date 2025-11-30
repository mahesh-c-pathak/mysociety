import * as functions from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import ExcelJS from 'exceljs';

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Helper: Cleans Excel cell values → always returns string
 */
function cleanCellValue(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();

  if (typeof value === 'object') {
    if (value.text) return String(value.text).trim(); // formatted cell
    if (value.result) return String(value.result).trim(); // formula result
    if (value.richText)
      return value.richText
        .map((r: any) => r.text)
        .join('')
        .trim();
  }

  return String(value).trim();
}

/**
 * AUTHENTICATED FUNCTION
 * Reads Excel from Storage → Registers Owners & Renters
 */
export const registerSocietyUsers = functions.onCall(async (request) => {
  try {
    // 1️⃣ AUTH CHECK
    if (!request.auth) {
      throw new functions.HttpsError(
        'unauthenticated',
        'You must be logged in to register society users.'
      );
    }

    // 2️⃣ INPUTS
    const societyName = request.data?.societyName;
    const filePath = request.data?.filePath; // path in Storage

    if (!societyName || !filePath) {
      throw new functions.HttpsError(
        'invalid-argument',
        'societyName and filePath are required.'
      );
    }

    logger.info(`🏘 Registering users for: ${societyName}`);
    logger.info(`📄 Reading Excel file: ${filePath}`);

    // 3️⃣ DOWNLOAD EXCEL FILE
    // 3️⃣ DOWNLOAD EXCEL FILE

    // 3️⃣ DOWNLOAD EXCEL FILE
    const file = bucket.file(filePath);
    const [buffer] = await file.download(); // Node Buffer

    // 4️⃣ LOAD WORKBOOK
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any); // ← FIX

    // 5️⃣ PROCESS BOTH SHEETS
    await processSheet(workbook, 'Owners', 'Owner', societyName);
    await processSheet(workbook, 'Renters', 'Renter', societyName);

    logger.info('✅ Completed importing all users.');

    return {success: true, message: 'Users imported successfully'};
  } catch (error: any) {
    logger.error('❌ Error importing users:', error);
    throw new functions.HttpsError('internal', error.message);
  }
});

async function processSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  userType: string,
  societyName: string
) {
  const sheet = workbook.getWorksheet(sheetName);

  if (!sheet) {
    logger.warn(`Sheet '${sheetName}' not found. Skipping.`);
    return;
  }

  logger.info(`📄 Processing sheet: ${sheetName}`);

  const rows = sheet.getSheetValues();

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || Object.keys(row).length === 0) continue; // ← Skip completely empty row

    const wing = cleanCellValue(row[1]);
    const floor = cleanCellValue(row[2]);
    const flat = cleanCellValue(row[3]);
    const firstName = cleanCellValue(row[4]);
    const lastName = cleanCellValue(row[5]);
    let email = cleanCellValue(row[6]);
    const phone = cleanCellValue(row[7]);

    // Skip incomplete rows
    if (!wing || !floor || !flat || !email) continue;

    // Clean & validate email
    email = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn(`⏭ Invalid email '${email}' in row ${i}, skipping`);
      continue;
    }

    logger.info(`➡️ Processing flat ${flat} (${userType})`);

    await registerSingleSocietyUser({
      societyName,
      wing,
      floor,
      flat,
      flatType: userType === 'Renter' ? 'Rent' : 'Owner',
      firstName,
      lastName,
      email,
      mobileNumber: phone,
      userType,
    });
  }
}

async function registerSingleSocietyUser(data: any) {
  const {
    societyName,
    wing,
    floor,
    flat,
    firstName,
    lastName,
    email,
    mobileNumber,
    flatType,
    userType,
  } = data;

  const emailLower = email.toLowerCase();

  // 1️⃣ Check if user exists in Firebase Auth
  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(emailLower);
    logger.info(`⚠️ Existing Auth user: ${emailLower}`);
  } catch {
    // Create new user
    logger.info(`🆕 Creating new Auth user: ${emailLower}`);
    userRecord = await admin.auth().createUser({
      email: emailLower,
      displayName: `${firstName} ${lastName}`,
    });
  }

  const uid = userRecord.uid;

  // 2️⃣ Firestore transaction
  const userDocRef = db.collection('users').doc(uid);
  const flatRef = db.doc(
    `Societies/${societyName}/${societyName} wings/${wing}/${societyName} floors/${floor}/${societyName} flats/${flat}`
  );

  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userDocRef);
    const flatSnap = await tx.get(flatRef);

    if (!flatSnap.exists) {
      throw new Error(`Flat ${flat} not found!`);
    }

    const baseUser = {
      firstName,
      lastName,
      email: emailLower,
      mobileNumber,
      displayName: `${firstName} ${lastName}`,
      approved: true,
      updatedAt: Date.now(),
    };

    if (!userSnap.exists) {
      // New Firestore user
      tx.set(userDocRef, {
        ...baseUser,
        createdBy: 'system',
        isPreCreated: true,
        mySociety: [
          {
            [societyName]: {
              myWing: {
                [wing]: {
                  floorData: {
                    [floor]: {
                      [flat]: {userType, userStatus: 'Approved', flatType},
                    },
                  },
                },
              },
            },
          },
        ],
      });
    } else {
      // Update existing user's mySociety
      const userData = userSnap.data()!;
      const mySociety = userData.mySociety || [];

      const index = mySociety.findIndex(
        (s: any) => Object.keys(s)[0] === societyName
      );

      if (index === -1) {
        mySociety.push({
          [societyName]: {
            myWing: {
              [wing]: {
                floorData: {
                  [floor]: {
                    [flat]: {userType, userStatus: 'Approved', flatType},
                  },
                },
              },
            },
          },
        });
      } else {
        const soc = mySociety[index][societyName];
        soc.myWing = soc.myWing || {};
        soc.myWing[wing] = soc.myWing[wing] || {floorData: {}};
        soc.myWing[wing].floorData[floor] =
          soc.myWing[wing].floorData[floor] || {};
        soc.myWing[wing].floorData[floor][flat] = {
          userType,
          userStatus: 'Approved',
          flatType,
        };

        mySociety[index] = {[societyName]: soc};
      }

      tx.update(userDocRef, {mySociety});
    }

    // 🔹 Update flat userDetails
    tx.update(flatRef, {
      [`userDetails.${uid}`]: {
        userName: `${firstName} ${lastName}`,
        userStatus: 'Approved',
        userType,
        userEmail: emailLower,
        usermobileNumber: mobileNumber,
        active: true,
        startDate: new Date().toISOString(),
      },
      ownerRegisterd: 'Registered',
      memberStatus: 'Registered',
    });
  });

  logger.info(`✅ Registered ${emailLower} for flat ${flat}`);
}
