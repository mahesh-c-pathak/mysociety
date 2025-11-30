import { Stack } from "expo-router";
import { useMemo } from "react";
import { PaperProvider, ActivityIndicator } from "react-native-paper";
import { adminTheme, gatekeeperTheme, userTheme } from "@/themes";
import { AuthRoleProvider, useAuthRole } from "@/lib/authRole";
import { SocietyProvider } from "@/utils/SocietyContext";
import { NotificationProvider } from "@/context/NotificationContext";
import VisitorApprovalModal from "@/components/VisitorApprovalModal";
import { GestureHandlerRootView } from "react-native-gesture-handler"; // 👈 import this

function ThemedGate({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuthRole();

  const theme = useMemo(() => {
    if (role === "admin") return adminTheme;
    if (role === "GateKeeper") return gatekeeperTheme;
    return userTheme;
  }, [role]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthRoleProvider>
        <SocietyProvider>
          <NotificationProvider>
            <ThemedGate>
              <Stack screenOptions={{ headerShown: false }} />
              <VisitorApprovalModal />
            </ThemedGate>
          </NotificationProvider>
        </SocietyProvider>
      </AuthRoleProvider>
    </GestureHandlerRootView>
  );
}
