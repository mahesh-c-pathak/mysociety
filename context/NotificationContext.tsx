import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import * as Notifications from "expo-notifications";
import type { EventSubscription } from "expo-notifications";
import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync";


interface VisitorApprovalData {
  visitorId: string;
  flatNumber: string;
  visitorName?: string;
  wing?: string;
  floorName?: string;
  societyName?: string;
}

interface NotificationContextType {
  expoPushToken: string | null;
  nativeToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
  pendingVisitor: VisitorApprovalData | null;
  setPendingVisitor: React.Dispatch<React.SetStateAction<VisitorApprovalData | null>>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

// 👇 configure system behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,  // 👈 required in SDK 52+
    shouldShowList: true,    // 👈 required in SDK 52+
  }),
});

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [nativeToken, setNativeToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [pendingVisitor, setPendingVisitor] = useState<VisitorApprovalData | null>(null);

  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then(
      ({ pushTokenString, nativeToken }) => {
        setExpoPushToken(pushTokenString);
        setNativeToken(nativeToken);
      },
      (err) => setError(err)
    );

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("🔔 Notification Received:", notification);
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("🔔 Notification Response:", JSON.stringify(response, null, 2));
        const data = response.notification.request.content.data;
    if (data.type === "visitor_approval") {
      setPendingVisitor({
        visitorId: data.visitorId as string,
        flatNumber: data.flatNumber as string,
        wing: data.wing as string,
        floorName: data.floorName as string,
        societyName: data.societyName as string,
      });
    }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{ expoPushToken,nativeToken, notification, error, pendingVisitor, setPendingVisitor }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
