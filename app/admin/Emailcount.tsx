import { View, Text } from "react-native";
import React, { useEffect } from "react";
import base64 from "react-native-base64";
import { useLocalSearchParams } from "expo-router";

const Emailcount = () => {
  const { token } = useLocalSearchParams() as { token: string };

  // --- Decode the JWT token ---
  useEffect(() => {
    try {
      const base64UrlPart = token.split(".")[1];

      // 1️⃣ Convert Base64URL → Base64
      let base64String = base64UrlPart.replace(/-/g, "+").replace(/_/g, "/");

      // 2️⃣ Add missing padding (=)
      const padding = 4 - (base64String.length % 4);
      if (padding !== 4) {
        base64String += "=".repeat(padding);
      }

      // 3️⃣ Decode safely
      const decoded = base64.decode(base64String);

      // 4️⃣ Parse JSON
      const finalData = JSON.parse(decoded);

      console.log("Decoded JWT:", finalData);
    } catch (error) {
      console.error("JWT decode error:", error);
    }
  }, [token]);
  return (
    <View>
      <Text>Emailcount</Text>
    </View>
  );
};

export default Emailcount;
