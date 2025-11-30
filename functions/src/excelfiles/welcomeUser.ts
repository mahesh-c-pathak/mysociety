import * as logger from 'firebase-functions/logger';
import {onCall} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import ExcelJS from 'exceljs';
import {PassThrough} from 'stream';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

export const welcomeUser = onCall(async (request) => {
  if (!request.auth) {
    logger.error('Unauthenticated access attempt');
    throw new Error('Authentication required to call this function.');
  }

  const societyName = request.data?.societyName;
  if (!societyName) throw new Error('Missing required parameter: societyName');

  // ✅ Fetch flats
  const customFlatsSubcollectionName = `${societyName} flats`;
  const flatsQuerySnapshot = await db
    .collectionGroup(customFlatsSubcollectionName)
    .get();

  if (flatsQuerySnapshot.empty) {
    throw new Error(`No flats found for society "${societyName}".`);
  }

  const flatEntries: {wing: string; floor: string; flat: string}[] = [];
  flatsQuerySnapshot.forEach((doc) => {
    const flatData = doc.data();
    // 🧠 Skip this flat if flatType is "dead"
    const flatType = flatData?.flatType?.toLowerCase();
    if (flatType === 'dead') return;
    const flatId = doc.id;
    const pathSegments = doc.ref.path.split('/');
    const wing = pathSegments[3] || 'N/A';
    const floor = pathSegments[5] || 'N/A';

    flatEntries.push({wing, floor, flat: flatId});
  });

  // ✅ Sort by Wing (A→Z), then Floor (custom order)
  const extractNumber = (floor: string): number => {
    if (!floor) return 0;

    const normalized = floor.trim().toUpperCase();

    if (
      normalized === 'FLOOR G' ||
      normalized === 'G' ||
      normalized === 'GROUND'
    )
      return 0; // Ground = 0

    const sbMatch = normalized.match(/SB(\d+)/); // SB1, SB2, ...
    if (sbMatch) return -parseInt(sbMatch[1], 10); // Below ground = negative

    const upMatch = normalized.match(/(\d+)/); // Floor 1, Floor 2, ...
    if (upMatch) return parseInt(upMatch[1], 10);

    // fallback for unrecognized floors (e.g. "Terrace")
    if (normalized.includes('TERRACE')) return 999;

    return 0;
  };

  flatEntries.sort((a, b) => {
    if (a.wing === b.wing) {
      const numA = extractNumber(a.floor);
      const numB = extractNumber(b.floor);
      return numA - numB;
    }
    return a.wing.localeCompare(b.wing);
  });

  // ✅ Create Excel workbook in memory
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Owners');

  // 🏷️ Title row (row 1)
  sheet.mergeCells('A1:I1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = societyName.toUpperCase();
  titleCell.font = {bold: true, size: 16};
  titleCell.alignment = {horizontal: 'center'};
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: {argb: 'FFECECEC'}, // light gray
  };
  titleCell.border = {
    top: {style: 'medium'},
    bottom: {style: 'medium'},
    left: {style: 'medium'},
    right: {style: 'medium'},
  };

  // 🧾 Header row (row 2)
  const headers = [
    'WING',
    'FLOOR',
    'FLAT',
    'FIRST NAME',
    'LAST NAME',
    'EMAIL',
    'PHONE',
    'CURRENT BALANCE',
    'FLAT AREA (sq-ft)',
  ];
  sheet.addRow(headers);

  const headerRow = sheet.getRow(2);
  headerRow.font = {bold: true};
  headerRow.alignment = {horizontal: 'center'};
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {argb: 'FFECECEC'}, // light gray
    };
    cell.border = {
      top: {style: 'medium'},
      bottom: {style: 'medium'},
      left: {style: 'medium'},
      right: {style: 'medium'},
    };
  });

  // 📄 Add Firestore rows
  flatEntries.forEach(({wing, floor, flat}) => {
    sheet.addRow([wing, floor, String(flat), '', '', '', '', '', '']);
  });

  // 🎨 Borders, lock logic & editable color
  const startRow = 3;
  const endRow = startRow + flatEntries.length - 1;

  // 🎨 Editable & data cell formatting
  for (let row = startRow; row <= endRow; row++) {
    const currentRow = sheet.getRow(row);
    let maxCellLength = 0;

    currentRow.eachCell((cell, colNumber) => {
      const valueLength = cell.value ? cell.value.toString().length : 0;
      if (valueLength > maxCellLength) maxCellLength = valueLength;

      if (colNumber >= 4 && colNumber <= 9) {
        // Editable cells (yellow)
        cell.protection = {locked: false};
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {argb: 'FFFFFF99'},
        };
        cell.border = {
          top: {style: 'thin'},
          bottom: {style: 'thin'},
          left: {style: 'thin'},
          right: {style: 'thin'},
        };
      } else if (cell.value) {
        // Non-editable cells with data (wing, floor, flat)
        cell.protection = {locked: true};
        cell.border = {
          top: {style: 'thin'},
          bottom: {style: 'thin'},
          left: {style: 'thin'},
          right: {style: 'thin'},
        };
      } else {
        // Empty locked cells
        cell.protection = {locked: true};
        cell.border = {
          top: undefined,
          bottom: undefined,
          left: undefined,
          right: undefined,
        };
      }
    });
  }

  // ✨ Auto-size columns
  sheet.columns.forEach((col) => {
    let maxLength = 0;
    col.eachCell({includeEmpty: true}, (cell) => {
      const cellValue = cell.value ? cell.value.toString() : '';
      maxLength = Math.max(maxLength, cellValue.length);
    });
    col.width = maxLength + 2; // padding
  });

  // 🔐 Protect sheet but allow column & row resizing
  await sheet.protect('King123$', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false, // cannot change colors/fonts
    formatColumns: true, // can resize columns
    formatRows: true, // can resize rows
    insertColumns: false,
    insertRows: false,
    deleteColumns: false,
    deleteRows: false,
  });

  // ✅ Clone "Society Users" → "Renters" (exact copy)
  const rentersSheet = workbook.addWorksheet('Renters');

  // Copy everything from Society Users to Renters
  sheet.eachRow({includeEmpty: true}, (row, rowNumber) => {
    const newRow = rentersSheet.getRow(rowNumber);

    row.eachCell({includeEmpty: true}, (cell, colNumber) => {
      const newCell = newRow.getCell(colNumber);

      // Copy value
      newCell.value = cell.value;

      // Copy all styles (font, alignment, fill, border, numFmt, etc.)
      newCell.style = JSON.parse(JSON.stringify(cell.style));
    });

    newRow.commit();
  });

  // Copy column widths
  sheet.columns.forEach((col, i) => {
    rentersSheet.getColumn(i + 1).width = col.width;
  });

  // Copy merged cells (title row merge, etc.)
  sheet.model.merges.forEach((mergeRange) => {
    rentersSheet.mergeCells(mergeRange);
  });

  // Apply same protection as original
  await rentersSheet.protect('King123$', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: true,
    formatRows: true,
    insertColumns: false,
    insertRows: false,
    deleteColumns: false,
    deleteRows: false,
  });

  // ✅ Upload to Storage
  const safeSociety = societyName.replace(/\s+/g, '_');
  const filePath = `${safeSociety}/Template/${safeSociety}_${Date.now()}.xlsx`;
  const file = bucket.file(filePath);
  const buffer = await workbook.xlsx.writeBuffer();
  const stream = new PassThrough();
  stream.end(buffer);

  await new Promise((resolve, reject) => {
    stream
      .pipe(
        file.createWriteStream({
          metadata: {
            contentType:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        })
      )
      .on('finish', resolve)
      .on('error', reject);
  });

  logger.info(`Excel file securely uploaded for ${societyName}`);

  // 🔹 Save latest and version record in Firestore
  const societyRef = db.collection('Societies').doc(societyName);
  const templatesRef = societyRef.collection('templates');

  // 🔹 Step 1: Pre-generate a random ID (like .add() would)
  const newTemplateRef = templatesRef.doc(); // auto-ID but not yet written

  // 🔹 Step 2: Run both writes atomically
  await db.runTransaction(async (t) => {
    // Update the society document
    t.set(
      societyRef,
      {
        latestTemplateUrl: filePath,
        lastGenerated: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );

    // Add the version record
    t.set(newTemplateRef, {
      url: filePath,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return {success: true};
});
