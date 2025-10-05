import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

// Change if needed (make this configurable too)
const API_BASE = "https://myhousingappvercel.vercel.app/api";

/**
 * Upload file to Backblaze using presigned URL
 */
export const uploadToBackblaze = async (
  folder: string,
  fileName: string,
  uri: string,
  contentType: string
) => {
  // 1. Ask server for signed upload URL
  const res = await fetch(`${API_BASE}/uploadToBackblaze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, fileName, contentType }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned non-JSON: ${text}`);
  }

  if (!res.ok || !data.url)
    throw new Error(data.error || "Failed to get signed upload URL");

  const signedUrl = data.url;

  // 2. Read file into base64 → ArrayBuffer
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });
  const fileBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  // 3. Upload file
  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Upload failed: ${errText}`);
  }

  return { success: true, url: signedUrl.split("?")[0] }; // return clean file URL
};

/**
 * Download file from Backblaze
 */
export const downloadFromBackblaze = async (
  folder: string,
  fileName: string
) => {
  // 1. Ask server for signed download URL
  const res = await fetch(`${API_BASE}/downloadFromBackblaze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: `${folder}/${fileName}` }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned non-JSON: ${text}`);
  }

  if (!res.ok || !data.url)
    throw new Error(data.error || "Failed to get download URL");

  const signedUrl = data.url;

  // 2. Download locally
  const localUri = FileSystem.documentDirectory + fileName;
  const downloadRes = await FileSystem.downloadAsync(signedUrl, localUri);

  // 3. Share or just return path
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(downloadRes.uri);
  }

  return downloadRes.uri;
};

/**
 * Delete file from Backblaze
 */
export const deleteFromBackblaze = async (folder: string, fileName: string) => {
  const res = await fetch(`${API_BASE}/deleteFromBackblaze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, fileName }),
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Failed to delete file");

  return { success: true };
};
