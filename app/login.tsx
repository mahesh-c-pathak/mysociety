import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { Button, Divider, Text } from "react-native-paper";
import { router, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { login } from "@/authService";
import {
  getAuth,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { useAuthRole } from "@/lib/authRole";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import AppbarComponent from "@/components/AppbarComponent";

const LandingScreen: React.FC = () => {
  const { user, loading } = useAuthRole();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const auth = getAuth();

  if (!loading && user && user.emailVerified) {
    return <Redirect href="/setupsociety" />;
  }

  const handleFirebaseLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    try {
      const userCredential = await login(email, password);
      const user = userCredential.user;

      // ✅ Only check Firebase Auth emailVerified status
      if (user.emailVerified) {
        router.replace("/setupsociety");
      } else {
        Alert.alert(
          "Email Not Verified",
          "Please verify your email before logging in. Check your inbox (including spam).",
          [
            {
              text: "Resend Verification Email",
              onPress: async () => {
                await sendEmailVerification(user);
                Alert.alert("Verification Email Sent", "Check your inbox.");
              },
            },
            { text: "OK" },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert("Login Failed", err.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Forgot Password", "Please enter your email first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Forgot Password",
        "Password reset email sent! Check your inbox."
      );
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#00AEEF" }}>
      {/* Top Appbar */}
      <AppbarComponent title="Login" source="Login" />
      <Divider />

      {/* Use KeyboardAvoidingView + KeyboardAware Scroll */}
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20} // adds spacing above keyboard
        resetScrollToCoords={{ x: 0, y: 0 }} // ✅ returns to top when keyboard closes
      >
        <View style={styles.innerContainer}>
          <Image
            source={require("@/assets/images/zebra_logo.png")}
            style={styles.logoImage}
          />

          <Text style={styles.title}>Login to your account</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              secureTextEntry={secureText}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setSecureText(!secureText)}>
              <Ionicons
                name={secureText ? "eye-off" : "eye"}
                size={24}
                color="gray"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.terms}>
            By Logging in, you agree to our{" "}
            <Text style={[styles.terms, { fontWeight: "bold" }]}>
              Terms & Conditions & Privacy Policy
            </Text>
          </Text>

          <Button
            mode="contained"
            style={styles.button}
            labelStyle={styles.loginButtonText}
            onPress={handleFirebaseLogin}
          >
            Login
          </Button>

          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* REGISTER pinned at bottom */}
        <TouchableOpacity
          onPress={() => router.push("/signup")}
          style={styles.registerContainer}
        >
          <Text style={styles.registerText}>
            Don’t have an account?{" "}
            <Text
              style={[
                styles.registerText,
                { fontWeight: "bold", fontSize: 20 },
              ]}
            >
              REGISTER
            </Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
};

export default LandingScreen;

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  innerContainer: {
    width: "100%",
    alignItems: "center",
  },
  logoImage: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  passwordInput: {
    flex: 1,
  },
  terms: {
    color: "white",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    width: "60%",
    marginVertical: 10,
    backgroundColor: "white",
  },
  loginButtonText: {
    color: "#00AEEF",
    fontWeight: "bold",
    fontSize: 20,
  },
  forgotPassword: {
    color: "white",
    marginTop: 10,
  },
  registerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    borderTopWidth: 0.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  registerText: {
    color: "white",
  },
});
