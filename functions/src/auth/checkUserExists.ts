import {onCall} from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Cloud Function: checkUserExists
 * --------------------------------
 * Checks if a user with the given email exists in Firebase Auth,
 * and returns details including whether the email is verified.
 *
 * Example response:
 * {
 *   exists: true,
 *   email: "test@example.com",
 *   uid: "abcd1234",
 *   displayName: "Test User",
 *   emailVerified: true
 * }
 */
export const checkUserExists = onCall(async (request) => {
  const {email} = request.data;

  if (!email || typeof email !== 'string') {
    throw new Error("Invalid or missing 'email' field in request.");
  }

  const emailLower = email.toLowerCase();

  try {
    const userRecord = await admin.auth().getUserByEmail(emailLower);

    return {
      exists: true,
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
    };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return {exists: false};
    }

    logger.error('Error checking user existence:', error);
    throw new Error('Internal error checking user existence');
  }
});
