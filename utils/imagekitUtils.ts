// utils/imagekitUtils.ts
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

const vercelApiUrl =
  "https://myhousingappvercel.vercel.app/api/getImagekitSignedUrl";

const uploadApiUrl =
  "https://myhousingappvercel.vercel.app/api/uploadToImagekit";

const deleteApiUrl =
  "https://myhousingappvercel.vercel.app/api/deleteFromImagekit";

const getFileDetailsApiUrl =
  "https://myhousingappvercel.vercel.app/api/getFileIdFromImagekitUrl";

/**
 * Pick image from gallery
 */
export const pickImage = async (): Promise<string | null> => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 1,
  });

  if (!result.canceled && result.assets?.length > 0) {
    return result.assets[0].uri;
  }
  return null;
};

/**
 * Capture image using camera
 */
export const captureImage = async (): Promise<string | null> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Camera Access Denied",
      "You need to allow camera access to use this feature."
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 1,
  });

  if (!result.canceled && result.assets?.length > 0) {
    return result.assets[0].uri;
  }
  return null;
};

/**
 * Fetch signed URL for private file
 */
export const fetchSignedUrl = async (filePath: string) => {
  try {
    const res = await fetch(
      `${vercelApiUrl}?filePath=${encodeURIComponent(filePath)}`
    );
    const data = await res.json();

    if (res.ok && data.url) {
      return { url: data.url };
    } else {
      throw new Error(data.error || "Failed to fetch signed URL");
    }
  } catch (err: any) {
    throw new Error(err.message);
  }
};

/**
 * Upload image via backend API (safer, no keys in client)
 */
export const uploadViaApi = async (
  imageUri: string,
  folderName: string,
  fileName: string // 👈 now passed from caller
): Promise<{ filePath: string }> => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result as string;

          const res = await fetch(uploadApiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              file: base64Data,
              fileName: fileName,
              folder: folderName,
            }),
          });

          const data = await res.json();
          if (res.ok && data.filePath) {
            resolve({ filePath: data.filePath });
          } else {
            reject(new Error(data.error || "Upload failed"));
          }
        } catch (error) {
          reject(error);
        }
      };
    });
  } catch (err: any) {
    throw new Error(err.message);
  }
};

/**
 * Delete file via backend API
 */
export const deleteFileViaApi = async (fileId: string) => {
  try {
    const res = await fetch(deleteApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    });

    const data = await res.json();
    if (res.ok) {
      return true;
    } else {
      throw new Error(data.error || "Failed to delete file");
    }
  } catch (err: any) {
    throw new Error(err.message);
  }
};

/**
 * Fetch file details (including fileId) via Vercel API
 */
export const getFileDetailsFromUrl = async (fileUrl: string) => {
  try {
    const res = await fetch(getFileDetailsApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl }),
    });

    const data = await res.json();

    if (res.ok && data && data.length > 0) {
      return data[0]; // return the first file object
    } else {
      throw new Error(data.error || "File not found");
    }
  } catch (err: any) {
    throw new Error(err.message);
  }
};
