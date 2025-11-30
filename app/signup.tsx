import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { Text } from "react-native-paper";
import { auth, db } from "@/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
  updatePassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import AppbarComponent from "@/components/AppbarComponent";
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";
import { sendEmailNew } from "@/utils/sendEmailNew";
import { getFunctions, httpsCallable } from "firebase/functions";

const RegisterScreen: React.FC = () => {
  const functions = getFunctions();
  const markEmailVerified = httpsCallable(functions, "markEmailVerified");
  const checkUserExistsFn = httpsCallable(functions, "checkUserExists");

  const [userCheckResult, setUserCheckResult] = useState<{
    exists: boolean;
    emailVerified?: boolean;
    uid?: string;
  } | null>(null);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  useCustomBackHandler();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [firstName, setfirstName] = useState<string>("");
  const [lastName, setlastName] = useState<string>("");
  const [secureText, setSecureText] = useState(true);

  const [countryCode, setCountryCode] = useState("+91");
  const [mobileNumber, setMobileNumber] = useState("");

  const [otp, setOtp] = useState("");

  const [step, setStep] = useState<"form" | "otp">("form");

  const [generatedOtp, setGeneratedOtp] = useState<string>("");

  const DEFAULT_PASSWORD = "King123$";

  const sendOtp = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !mobileNumber.trim()
    ) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    // ✅ Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    // ✅ Validate mobile number (10 digits only)
    if (!/^\d{10}$/.test(mobileNumber)) {
      Alert.alert("Error", "Mobile number must be exactly 10 digits.");
      return;
    }

    const emailLower = email.toLowerCase();

    // ✅ Step 1: Check if user exists via Cloud Function
    try {
      const res: any = await checkUserExistsFn({ email: emailLower });
      const data = res.data;

      // Store in state for verifyOtp
      setUserCheckResult(data);

      if (data.exists) {
        if (data.emailVerified) {
          Alert.alert(
            "Account Exists",
            "This email is already registered and verified. Please log in."
          );
          router.replace("/login");
          return;
        } else {
          Alert.alert(
            "Email Not Verified",
            "Your email exists but is not verified. We’ll resend the OTP."
          );
        }
      }
    } catch (err) {
      console.error("Error checking user existence:", err);
      Alert.alert(
        "Error",
        "Could not verify email existence. Try again later."
      );
      return;
    }

    // ✅ Step 2: Send OTP
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log("Generated OTP:", otp);

      await sendEmailNew({
        to: emailLower,
        subject: "Your OTP Code",
        text: `Your OTP is: ${otp}`,
      });

      setGeneratedOtp(otp);
      Alert.alert("OTP Sent", "Check your email for the verification code.");
      setStep("otp");
    } catch (err) {
      console.error("Error sending OTP:", err);
      Alert.alert("Error", "Failed to send OTP. Please try again.");
    }
  };

  const verifyOtp = async () => {
    if (otp.trim() !== generatedOtp) {
      Alert.alert(
        "Invalid OTP",
        "Please enter the correct OTP sent to your email."
      );
      return;
    }

    console.log("OTP verified successfully ✅");
    setLoading(true);

    const emailLower = email.toLowerCase();
    const displayName = `${firstName} ${lastName}`;

    try {
      // ✅ Use result from sendOtp
      const userExists = userCheckResult?.exists;
      const emailVerified = userCheckResult?.emailVerified;

      if (userExists && !emailVerified) {
        console.log("Pre-created user detected (not verified)");

        // Sign in using default password
        const signInRes = await signInWithEmailAndPassword(
          auth,
          emailLower,
          DEFAULT_PASSWORD
        );

        // Update password & profile
        await updatePassword(signInRes.user, password);
        await updateProfile(signInRes.user, { displayName });

        await markEmailVerified({ email: emailLower });

        await setDoc(
          doc(db, "users", signInRes.user.uid),
          {
            firstName,
            lastName,
            email: emailLower,
            mobileNumber,
            countryCode,
            isPreCreated: true,
            createdBy: "admin",
            displayName,
            approved: true,
            emailVerified: true,
          },
          { merge: true }
        );

        Alert.alert("Welcome", "Your account is activated. Please login.");
        router.replace("/login");
        return;
      }

      // 🆕 Self-registration flow
      if (!userExists) {
        console.log("Self-registration flow");

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          emailLower,
          password
        );
        const user = userCredential.user;

        await updateProfile(user, { displayName });
        await markEmailVerified({ email: emailLower });

        await setDoc(doc(db, "users", user.uid), {
          firstName,
          lastName,
          email: emailLower,
          mobileNumber,
          countryCode,
          approved: false,
          displayName,
        });

        Alert.alert(
          "Registered",
          "Your account has been created. You can login now."
        );
        router.replace("/login");
        return;
      }

      // Should not happen — verified users are redirected earlier
      Alert.alert("Account Already Verified", "Please log in instead.");
      router.replace("/login");
    } catch (err: any) {
      console.error("Error verifying OTP:", err);
      Alert.alert("Error", err.message || "Failed to verify OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* Top Appbar */}

        <AppbarComponent title="New Account" source="Member" />

        {/* Use KeyboardAvoidingView + KeyboardAware Scroll */}
        <KeyboardAwareScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: insets.bottom + 100 }, // always allow space for the footer
          ]}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={20} // adds spacing above keyboard
          resetScrollToCoords={{ x: 0, y: 0 }} // ✅ returns to top when keyboard closes
        >
          {/* First Name */}
          <View style={styles.customInputContainer}>
            <CustomInput
              label="First Name"
              value={firstName}
              onChangeText={setfirstName}
            />
          </View>

          {/* Last Name */}
          <View style={styles.customInputContainer}>
            <CustomInput
              label="Last Name"
              value={lastName}
              onChangeText={setlastName}
            />
          </View>

          {/* Phone Number */}

          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.inputContainer}>
            <View style={{ width: 60, marginRight: 6 }}>
              <CustomInput value={countryCode} onChangeText={setCountryCode} />
            </View>
            <View style={{ flex: 1 }}>
              <CustomInput
                value={mobileNumber}
                onChangeText={setMobileNumber}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.customInputContainer}>
            <CustomInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>

          {/* Password */}
          <View style={styles.passwordContainer}>
            <View style={{ width: "90%" }}>
              <CustomInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureText}
              />
            </View>
            <TouchableOpacity
              onPress={() => setSecureText(!secureText)}
              style={{ marginHorizontal: 5 }}
            >
              <Ionicons
                name={secureText ? "eye-off" : "eye"}
                size={24}
                color="gray"
                style={{ marginTop: 16 }}
              />
            </TouchableOpacity>
          </View>
          {step === "otp" && (
            <>
              <View style={{ marginBottom: 16 }}>
                <CustomInput
                  label="Enter OTP"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="numeric"
                />
              </View>
            </>
          )}
        </KeyboardAwareScrollView>

        {/* Save Button */}
        {/* Fixed button at bottom */}
        <View style={[styles.footer, { bottom: insets.bottom }]}>
          {step === "form" && (
            <CustomButton
              onPress={sendOtp}
              title={"Register"}
              style={{ backgroundColor: "#2196F3" }}
            />
          )}

          {step === "otp" && (
            <CustomButton
              onPress={verifyOtp}
              title="Verify OTP"
              style={{ backgroundColor: "green", marginTop: 16 }}
            />
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  scrollContainer: { padding: 16 },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginBottom: 5,
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  customInputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
});
