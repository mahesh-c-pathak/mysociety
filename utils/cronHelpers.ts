// utils/cronHelpers.ts
export function getExpiresAt(minutesToAdd: number = 10): number {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutesToAdd);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return parseInt(`${year}${month}${day}${hours}${minutes}${seconds}`);
}
