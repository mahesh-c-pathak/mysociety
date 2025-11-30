import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebaseConfig";

export const sendInAppMessage = async (
  societyName: string,
  toUserId: string,
  title: string,
  body: string,
  type: string,
  path?: string // 🔹 optional path
) => {
  try {
    const messagesRef = collection(
      db,
      "Societies",
      societyName,
      "InAppMessages"
    );
    await addDoc(messagesRef, {
      toUserId,
      title,
      body,
      type,
      path: path || null, // 🔹 store only if provided
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error sending message:", error);
  }
};
