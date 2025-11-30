import {onCall} from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Callable function to send FCM notifications.
 *
 * Input:
 * {
 *   tokens: string[],
 *   title: string,
 *   body: string,
 *   data?: { [key: string]: string }
 * }
 */

export const sendNotification = onCall(async (request) => {
  // 1️⃣ AUTH CHECK
  if (!request.auth) {
    logger.error('Unauthenticated access attempt');
    throw new Error('Authentication required to call this function.');
  }

  // 2️⃣ INPUTS
  const {tokens, title, body, data: payloadData} = request.data;

  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    throw new Error('Missing or invalid FCM tokens.');
  }

  // 3️⃣ FCM requires all data values to be strings
  const safeData: {[key: string]: string} = {};
  if (payloadData && typeof payloadData === 'object') {
    for (const [key, value] of Object.entries(payloadData)) {
      safeData[key] = String(value);
    }
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {title, body},
      data: safeData,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses.map((r) => ({
        success: r.success,
        error: r.error?.message || null,
      })),
    };
  } catch (error: any) {
    console.error('Error sending FCM:', error);
    throw new Error(error.message || 'Failed to send notification');
  }
});
