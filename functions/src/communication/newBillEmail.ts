import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import {onDocumentWritten} from 'firebase-functions/v2/firestore';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ---------------------------------------------------
// Templates
// ---------------------------------------------------
const templatesDir = path.join(__dirname, 'templates');

const loadTemplate = (templateName: string) => {
  const filePath = path.join(templatesDir, `${templateName}.hbs`);
  const source = fs.readFileSync(filePath, 'utf8');
  return handlebars.compile(source);
};

// Email Transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.HOSTINGER_EMAIL,
    pass: process.env.HOSTINGER_PASS,
  },
});

// ---------------------------
// Helper: Chunk an array
// ---------------------------
const chunkArray = (arr: string[], size: number) => {
  const chunks: string[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

export const newBillEmail = onDocumentWritten(
  'Societies/{societyName}/Communications/pendingCommunication',
  async (event) => {
    const newData = event.data?.after?.data();
    const societyName = event.params.societyName;

    if (!newData) return;
    const jobs = newData.jobs || [];
    if (!jobs.length) return;

    logger.log(`Processing ${jobs.length} communication jobs...`);
    const template = loadTemplate('new-bill');

    // ---------------------------------------------------
    // LOOP JOBS
    // ---------------------------------------------------
    for (const job of jobs) {
      const masterBillId = job.masterBillId;
      logger.log(`🔍 Processing Master Bill ID: ${masterBillId}`);
      if (!masterBillId) continue;

      const mainBillRef = db.doc(`Bills/${masterBillId}`);

      // 🚀 PARALLEL READ — MAIN BILL
      const mainBillSnap = await mainBillRef.get();
      if (!mainBillSnap.exists) {
        logger.error(`❌ Main Bill NOT FOUND @ Bills/${masterBillId}`);
        continue;
      }

      const mainBillData = mainBillSnap.data();
      const {flatPaths = [], billNumbers = [], name, dueDate} = mainBillData;

      logger.log(`📌 MAIN BILL LOADED`, {
        flats: flatPaths.length,
        bills: billNumbers.length,
      });

      const customFlatsBillsSubcollectionName = 'flatbills';

      // ---------------------------------------------------
      // 🚀 PARALLEL READ — ALL FLATS + ALL FLAT BILLS
      // ---------------------------------------------------
      const flatReads = flatPaths.map((flatPath) =>
        db
          .doc(flatPath)
          .get()
          .catch(() => null)
      );

      const flatBillReads = flatPaths.map((flatPath, i) => {
        const billNo = billNumbers[i];
        const flatBillRef = `${flatPath}/${customFlatsBillsSubcollectionName}/${billNo}`;
        return db
          .doc(flatBillRef)
          .get()
          .catch(() => null);
      });

      const [flatSnaps, flatBillSnaps] = await Promise.all([
        Promise.all(flatReads),
        Promise.all(flatBillReads),
      ]);

      // ---------------------------------------------------
      // PARALLEL PUSH NOTIFICATION QUEUE
      // ---------------------------------------------------
      const pushTasks: Promise<any>[] = [];

      // ---------------------------------------------------
      // PROCESS FLATS
      // ---------------------------------------------------
      for (let i = 0; i < flatPaths.length; i++) {
        const flatRef = flatPaths[i];
        const billNumber = billNumbers[i];
        const flatSnap = flatSnaps[i];
        const flatBillSnap = flatBillSnaps[i];

        logger.log(`\n======================`);
        logger.log(`🏠 Flat: ${flatRef}`);
        logger.log(`🧾 Bill Number: ${billNumber}`);
        logger.log(`======================`);

        if (!flatSnap || !flatSnap.exists) continue;
        if (!flatBillSnap || !flatBillSnap.exists) {
          logger.log(
            `⚠️ Flat bill not found @ ${flatRef}/flatbills/${billNumber}`
          );
          continue;
        }

        const flatData = flatSnap.data();
        const flatBillData = flatBillSnap.data();

        // ✔ Flat-wise amount
        const amount =
          flatBillData.totalAmount ||
          flatBillData.amount ||
          flatBillData.finalAmount ||
          0;

        // Parse wing & flat
        const seg = flatRef.split('/');
        const wing = seg[3];
        const flat = seg[7];

        // Extract user info
        const {userDetails} = flatData;
        const userEmails: string[] = [];
        const userNames: string[] = [];
        const tokens: string[] = [];

        if (userDetails && typeof userDetails === 'object') {
          for (const entry of Object.values<any>(userDetails)) {
            if (entry?.userEmail) userEmails.push(entry.userEmail);
            if (entry?.userName) userNames.push(entry.userName);
            if (Array.isArray(entry?.nativeTokens)) {
              tokens.push(...entry.nativeTokens);
            }
          }
        }

        // ---------------------------------------------------
        // EMAILS (same logic)
        // ---------------------------------------------------
        if (userEmails.length > 0) {
          const emailTasks = userEmails.map((email, idx) => {
            const memberName = userNames[idx] || 'Member';

            const htmlBody = template({
              memberName,
              societyName,
              wing,
              flat,
              name,
              amount,
              billNumber,
              dueDate,
            });

            return transporter.sendMail({
              from: `"${societyName}" <${process.env.HOSTINGER_EMAIL}>`,
              to: email,
              subject: `New Bill Generated - ${name} for ${wing}-${flat}`,
              html: htmlBody,
            });
          });

          try {
            await Promise.all(emailTasks);
            logger.log(`✔ Emails sent → ${wing}-${flat}`);
          } catch (err) {
            logger.error(`❌ Email error → ${wing}-${flat}:`, err);
          }
        }

        // ---------------------------------------------------
        // 🚀 PARALLEL PUSH — QUEUE CHUNKED BATCHES (limit 500)
        // ---------------------------------------------------
        if (tokens.length > 0) {
          const tokenChunks = chunkArray(tokens, 450);

          for (const chunk of tokenChunks) {
            const message: admin.messaging.MulticastMessage = {
              tokens: chunk,
              notification: {
                title: 'New Bill Generated',
                body: `${name} for ${societyName}, ${wing}-${flat} - ₹${amount}`,
              },
              data: {
                billNumber: String(billNumber),
                societyName,
                wing,
                flat: String(flat),
                amount: String(amount),
              },
            };

            // Push this chunk's send operation into global queue
            pushTasks.push(
              admin
                .messaging()
                .sendEachForMulticast(message)
                .then((res) => {
                  logger.log(
                    `📲 Push → ${wing}-${flat} | Tokens: ${chunk.length} | Success: ${res.successCount}, Fail: ${res.failureCount}`
                  );
                })
                .catch((e) => {
                  logger.error(`❌ Push failed → ${wing}-${flat}`, e);
                })
            );
          }
        }
      }

      // ---------------------------------------------------
      // 🚀 RUN ALL PUSH NOTIFICATIONS IN PARALLEL
      // ---------------------------------------------------
      logger.log(
        `📲 Running ${pushTasks.length} push notifications in parallel...`
      );
      await Promise.all(pushTasks);
      logger.log(`📲 All parallel push notifications completed.`);
    }

    logger.log('🎉 All jobs processed.');
  }
);
