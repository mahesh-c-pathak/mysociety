export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  if (!tokens?.length) return;

  try {
    const res = await fetch(
      "https://myhousingappvercel.vercel.app/api/sendNotification",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens, title, body, data }),
      }
    );

    if (!res.ok) {
      console.error("Push notification failed:", await res.text());
    }

    return res;
  } catch (err) {
    console.error("Error sending push notification:", err);
  }
}
