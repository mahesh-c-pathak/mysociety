import { Drawer } from "expo-router/drawer";
import CustomDrawerContent from "@/components/CustomDrawerContent"; // adjust path

export default function Layout() {
  return (
    <Drawer
      screenOptions={{ headerShown: false }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="index" options={{ drawerLabel: "Home" }} />
      {/*
      <Drawer.Screen name="profile" options={{ drawerLabel: "Profile" }} />
      <Drawer.Screen
        name="changepassword"
        options={{ drawerLabel: "Change Password" }}
      />
      <Drawer.Screen name="contact" options={{ drawerLabel: "Contact us" }} />
      <Drawer.Screen name="feedback" options={{ drawerLabel: "Feedback" }} />
      <Drawer.Screen name="about" options={{ drawerLabel: "About us" }} />
      */}
      <Drawer.Screen
        name="terms"
        options={{ drawerLabel: "Terms and Conditions" }}
      />
      <Drawer.Screen
        name="privacypolicy"
        options={{ drawerLabel: "Privacy Policy" }}
      />
    </Drawer>
  );
}
