import { Redirect, type Href, usePathname } from "expo-router";
import { ReactNode } from "react";
import { useAuthRole } from "@/lib/authRole";
import { ActivityIndicator } from "react-native-paper";

type Role = "admin" | "gatekeeper" | "user";

// Map each role to a valid, type-safe route
// Role → Route mapping (type-safe because pages exist)
const rolePaths: Record<Role, Href> = {
  admin: "/admin",
  gatekeeper: "/gatekeeper",
  user: "/user",
};

export default function RoleGuard({
  allow,
  children,
}: {
  allow: Role[];
  children: ReactNode;
}) {
  const { user, role, loading } = useAuthRole();
  const pathname = usePathname(); // ✅ correct hook

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  // Not logged in → go to landing/login
  if (!user) return <Redirect href="/" />;

  // Logged in but no role assigned → go to setupsociety
  if (!role) return <Redirect href="/setupsociety" />;

  // Logged in but no role assigned → go to setupsociety (unless already there)
  if (!role) {
    if (!pathname.startsWith("/setupsociety")) {
      return <Redirect href="/setupsociety" />;
    }
    return <>{children}</>;
  }

  // Logged in with a role, but not allowed on this page → redirect to their home
  if (role && !allow.includes(role)) {
    return <Redirect href={rolePaths[role]} />;
  }
  // All good → render page
  return <>{children}</>;
}
 