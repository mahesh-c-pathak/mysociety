import {onCall, HttpsError} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as ExcelJS from 'exceljs';
import * as logger from 'firebase-functions/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const generateSocietyTemplateExcel = onCall(
  async (
    request
  ): Promise<{success: boolean; publicUrl?: string; totalFlats?: number}> => {
    // 🛑 Add this check at the beginning
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    try {
      const {societyName} = request.data;

      if (!societyName || typeof societyName !== 'string') {
        throw new HttpsError(
          'invalid-argument',
          'Missing or invalid parameter. Expected { societyName: string }.'
        );
      }

      const db = admin.firestore();
      const bucket = admin.storage().bucket();

      const customFlatsSubcollectionName = `${societyName} flats`;
      const flatsQuerySnapshot = await db
        .collectionGroup(customFlatsSubcollectionName)
        .get();

      if (flatsQuerySnapshot.empty) {
        throw new HttpsError(
          'not-found',
          `No flats found for society "${societyName}".`
        );
      }

      // 🔹 Extract wing, floor, flat IDs
      const flatEntries: {wing: string; floor: string; flat: string}[] = [];
      flatsQuerySnapshot.forEach((doc) => {
        const flatId = doc.id;
        const flatPath = doc.ref.path;
        const pathSegments = flatPath.split('/');
        const wing = pathSegments[3] || 'N/A';
        const floor = pathSegments[5] || 'N/A';
        flatEntries.push({wing, floor, flat: flatId});
      });

      // 🔹 Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Society Users');

      // Title
      sheet.mergeCells('A1:H1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = societyName.toUpperCase();
      titleCell.font = {bold: true, size: 16};
      titleCell.alignment = {horizontal: 'center'};

      // Header row
      const headers = [
        'WING',
        'FLOOR',
        'FLAT',
        'FIRST NAME',
        'LAST NAME',
        'EMAIL',
        'PHONE',
        'CURRENT BALANCE',
      ];
      sheet.addRow(headers);

      const headerRow = sheet.getRow(2);
      headerRow.font = {bold: true};
      headerRow.alignment = {horizontal: 'center'};
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {argb: 'FFFFCC'},
        };
        cell.border = {
          top: {style: 'thin'},
          left: {style: 'thin'},
          bottom: {style: 'thin'},
          right: {style: 'thin'},
        };
      });

      // Add flats
      flatEntries.forEach(({wing, floor, flat}) => {
        sheet.addRow([wing, floor, flat, '', '', '', '', '']);
      });

      // Column widths
      sheet.columns = [
        {width: 10},
        {width: 10},
        {width: 10},
        {width: 18},
        {width: 18},
        {width: 30},
        {width: 15},
        {width: 18},
      ];

      // Lock all cells
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.protection = {locked: true};
        });
      });

      // Unlock owner-editable columns (D to H)
      const startRow = 3;
      const endRow = startRow + flatEntries.length - 1;
      for (let row = startRow; row <= endRow; row++) {
        for (let col = 4; col <= 8; col++) {
          sheet.getCell(row, col).protection = {locked: false};
        }
      }

      // Protect sheet
      await sheet.protect('society-template', {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertColumns: false,
        insertRows: false,
        deleteColumns: false,
        deleteRows: false,
        sort: false,
        autoFilter: false,
        pivotTables: false,
      });

      // Save buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const uint8Buffer = new Uint8Array(buffer);

      // 🔹 Upload to Storage: societyName/Template/
      const safeSociety = societyName.replace(/\s+/g, '_');
      const filePath = `${safeSociety}/Template/${safeSociety}_${Date.now()}.xlsx`;
      const file = bucket.file(filePath);

      await file.save(uint8Buffer, {
        metadata: {
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });

      // Generate a signed URL valid for 10 minutes
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      });

      const publicUrl = signedUrl; // keep the same variable name for consistency

      // ✅ Log for debugging
      logger.info(`✅ Excel generated and uploaded: ${filePath}`);

      // 🔹 Save latest and version record in Firestore
      const societyRef = db.collection('societies').doc(societyName);
      const templatesRef = societyRef.collection('templates');

      // 🔹 Step 1: Pre-generate a random ID (like .add() would)
      const newTemplateRef = templatesRef.doc(); // auto-ID but not yet written

      // 🔹 Step 2: Run both writes atomically
      await db.runTransaction(async (t) => {
        // Update the society document
        t.set(
          societyRef,
          {
            latestTemplateUrl: publicUrl,
            totalFlats: flatEntries.length,
            lastGenerated: admin.firestore.FieldValue.serverTimestamp(),
          },
          {merge: true}
        );

        // Add the version record
        t.set(newTemplateRef, {
          url: publicUrl,
          totalFlats: flatEntries.length,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      return {success: true, publicUrl, totalFlats: flatEntries.length};
    } catch (error: any) {
      logger.error('❌ Excel generation failed:', error);
      throw new HttpsError(
        'internal',
        `Excel generation failed: ${error.message || error}`
      );
    }
  }
);
