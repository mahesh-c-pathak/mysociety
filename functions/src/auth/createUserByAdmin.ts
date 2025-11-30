import {onCall} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Cloud Function: createUserByAdmin
 * --------------------------------
 * Creates one or multiple Firebase Auth users with a **default password**.
 *
 * Input:
 * {
 *   users: [
 *     { email: string },
 *     { email: string },
 *     ...
 *   ]
 * }
 *
 * Response:
 * {
 *   results: [
 *     { success: true, uid: string, email: string },
 *     { success: false, email: string, reason: string }
 *   ]
 * }
 */
export const createUserByAdmin = onCall(async (request) => {
  const {users} = request.data;

  if (!Array.isArray(users) || users.length === 0) {
    throw new Error("Missing or invalid 'users' array in request.");
  }

  // ✅ Default password for all users
  const DEFAULT_PASSWORD = 'King123$';

  const results: any[] = [];

  for (const user of users) {
    const {email} = user;

    if (!email || typeof email !== 'string') {
      results.push({
        success: false,
        email: email || null,
        reason: 'invalid-email',
      });
      continue;
    }

    try {
      const userRecord = await admin.auth().createUser({
        email: email.toLowerCase(),
        password: DEFAULT_PASSWORD,
      });

      logger.info(`✅ Created user: ${email}`);

      results.push({
        success: true,
        uid: userRecord.uid,
        email: userRecord.email,
      });
    } catch (error: any) {
      logger.error(`❌ Error creating ${email}:`, error);

      results.push({
        success: false,
        email,
        reason:
          error.code === 'auth/email-already-exists'
            ? 'email-already-exists'
            : error.message || 'unknown-error',
      });
    }
  }

  return {results};
});
