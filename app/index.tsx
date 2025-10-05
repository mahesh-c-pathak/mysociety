// app/index.tsx
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuthRole } from "../lib/authRole";

export default function Index() {
  const { user, role, loading } = useAuthRole();


  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If logged in and role is known → go to /role
  if (user && role) {
    return <Redirect href={{ pathname: `/${role}` }} />;

  }

  // Otherwise → go to login
  return <Redirect href="/login" />;
}
