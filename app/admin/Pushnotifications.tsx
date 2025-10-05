import {
  SafeAreaView,
  StatusBar,
  Text,
  View,
  Platform,
  Button,
} from "react-native";
import { useNotification } from "@/context/NotificationContext";
import { getExpiresAt } from "@/utils/cronHelpers";

export default function Pushnotifications() {
  const { notification, expoPushToken, nativeToken, error } = useNotification();

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center" }}>
        <Text>Error: {error.message}</Text>
      </SafeAreaView>
    );
  }

  async function sendTestNotification() {
    if (!expoPushToken) return;

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: "default",
        channelId: "default",
        title: "Test Notification",
        body: "Hello from Expo!",
        data: { extraData: "Some data here" },
      }),
    });
  }

  // 🔔 Send via FCM (through your Vercel function)
  async function sendFCMTestNotification() {
    if (!nativeToken) return;

    await fetch("https://myhousingappvercel.vercel.app/api/sendNotification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tokens: [nativeToken], // 👈 wrap in array
        title: "FCM Push",
        body: "Hello from Firebase Cloud Messaging!",
        data: { foo: "bar" },
      }),
    });
  }

  async function createCronJobFromApp() {
    if (!nativeToken) return;

    const fcmTokens = [nativeToken];
    const expiresAt = getExpiresAt(10); // expires after 10 minutes

    const res = await fetch(
      "https://myhousingappvercel.vercel.app/api/createCronJob",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokens: fcmTokens,
          title: "Cron Push with expiry vertion 2",
          body: "This notification comes every 1 minutes ⏰ and will expire after 10 minutes",
          data: { foo: "bar" },
          schedule: {
            timezone: "Asia/Kolkata",
            expiresAt, // 👈 calculated in Expo
            hours: [-1],
            mdays: [-1],
            minutes: [-1],
            months: [-1],
            wdays: [-1],
          },
        }),
      }
    );

    const json = await res.json();
    console.log("Cron job created:", json);
  }

  return (
    <View
      style={{
        flex: 1,
        padding: 10,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 10,
      }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 8 }}>
          Push Notifications Demo
        </Text>

        <Text style={{ marginTop: 16, fontWeight: "bold", color: "red" }}>
          Your push token:
        </Text>
        <Text selectable>{expoPushToken ?? "No token yet"}</Text>

        {/* Native device token */}
        <Text style={{ marginTop: 16, fontWeight: "bold", color: "blue" }}>
          Native FCM/APNs Token:
        </Text>
        <Text selectable>{nativeToken ?? "No native token yet"}</Text>

        <Text style={{ marginTop: 16, fontWeight: "bold" }}>
          Latest notification:
        </Text>
        <Text>{notification?.request.content.title ?? "None"}</Text>
        <Text>
          {notification
            ? JSON.stringify(notification.request.content.data, null, 2)
            : "No data"}
        </Text>
        <Button title="Send Test Notification" onPress={sendTestNotification} />
        <View style={{ marginTop: 12 }}>
          <Button
            title="Send via FCM (Vercel)"
            onPress={sendFCMTestNotification}
          />
        </View>
        <View style={{ marginTop: 25 }}>
          <Button
            title="Create test Cron Job (Vercel)"
            onPress={createCronJobFromApp}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
