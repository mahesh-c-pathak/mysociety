/* eslint-disable quotes */
/* eslint-disable object-curly-spacing */
/* eslint-disable max-len */
import {onCall} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

interface MarkEmailVerifiedData {
  uid?: string;
}

export const markEmailVerified = onCall<MarkEmailVerifiedData>(
  async (request) => {
    const {uid} = request.data;

    // Use authenticated user's UID if no UID provided
    const targetUid = uid || request.auth?.uid;
    if (!targetUid) {
      throw new Error('Unauthenticated or missing UID');
    }

    await admin.auth().updateUser(targetUid, {emailVerified: true});
    return {success: true, message: 'Email marked as verified.'};
  }
);
