import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth } from "./firebaseConfig";

// Register new user

export const register = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

// Login existing user

export const login = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

// Logout current user

export const logout = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn("⚠️ No user is currently signed in — skipping logout.");
      return;
    }
    await signOut(auth);
  } catch (error) {
    console.error("🚨 Logout failed:", error);
    throw error;
  }
};

// ✅ Change password (with reauthentication support)
export const changePassword = async (
  currentPassword: string,
  newPassword: string
) => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error("No user is currently signed in.");
    }

    // Step 1: Reauthenticate
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword
    );
    await reauthenticateWithCredential(user, credential);
    console.log("✅ User reauthenticated successfully.");

    // Step 2: Update password
    await updatePassword(user, newPassword);
    console.log("🔒 Password updated successfully!");
  } catch (error: any) {
    console.error("🚨 Failed to update password:", error);

    if (error.code === "auth/wrong-password") {
      throw new Error("The current password you entered is incorrect.");
    } else if (error.code === "auth/weak-password") {
      throw new Error("The new password is too weak. Try something stronger.");
    } else {
      throw new Error(error.message || "Failed to change password.");
    }
  }
};
