import phoneAuthStyles from "@/styles/phoneAuthStyles";
import { useEffect, useState } from "react";
import { WebView } from "react-native-webview";
import { getUniqueId } from "react-native-device-info";
import { useRouter } from "expo-router";

// Functional component
const Signin = () => {
  const router = useRouter();
  // Local states
  const [deviceId, setDeviceId] = useState("");

  // Declaring an object
  const userInfo = {
    iss: "phmail",
    aud: "user",
    client_id: "13937169348359467022",
  };

  // Declaring sign-in URL
  const URI = `https://auth.phone.email/log-in?client_id=${userInfo.client_id}&auth_type=4&device=${deviceId}`;

  // Hooks
  useEffect(() => {
    // Method to fetch device ID
    const fetchDeviceId = async () => {
      // Getting unique ID
      const id = await getUniqueId();

      // Updating state
      setDeviceId(id);

      // Log the device ID to the console
      console.log("Device ID:", id);
    };

    fetchDeviceId();
  }, []);

  const phoneAuthJwt = (event) => {
    const encodedJWT = event.nativeEvent.data;

    // Navigate to /email-count?token=xxxx
    router.push({
      pathname: "/admin/Emailcount",
      params: { token: encodedJWT },
    });
  };

  // Returning JSX
  return (
    <WebView
      source={{ uri: URI }}
      style={phoneAuthStyles.webView}
      onMessage={phoneAuthJwt}
      ref={(webView) => {
        this.webView = webView;
      }}
    />
  );
};

// Exporting
export default Signin;
