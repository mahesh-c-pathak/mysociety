import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import {
  Text,
  Appbar,
} from "react-native-paper";
import { auth, db } from "@/firebaseConfig"; 
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  AuthError,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import { Ionicons } from "@expo/vector-icons";

type AuthErrorType = AuthError & {
  message: string;
};

const RegisterScreen: React.FC = () => {

  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [firstName, setfirstName] = useState<string>("");
  const [lastName, setlastName] = useState<string>("");
  const [secureText, setSecureText] = useState(true);

  const [countryCode, setCountryCode] = useState("+91");
  const [mobileNumber, setMobileNumber] = useState("");

  const handleRegister = async () => {
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    // Validate mobile number (10 digits only)
    if (!/^\d{10}$/.test(mobileNumber)) {
      Alert.alert("Error", "Mobile number must be exactly 10 digits.");
      return;
    }

    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await updateProfile(user, { displayName: firstName + " " + lastName });

      // Check if email is valid by sending a verification email
      try {
        await sendEmailVerification(user);
        Alert.alert(
          "Success",
          "Verification email sent. Please check your inbox.",
          [{ text: "OK", onPress: () => router.replace("/login") }]
        );
      } catch (emailError) {
        Alert.alert(
          "Email Verification Failed",
          "Failed to send verification email. Please check the email address.",
          [{ text: "OK" }]
        );
      }

      await setDoc(doc(db, "users", user.uid), {
        firstName,
        lastName,
        email,
        mobileNumber,
        countryCode,
        approved: false,
      });
      
    } catch (err) {
      const firebaseError = err as AuthErrorType;

      if (firebaseError.code === "auth/email-already-in-use") {
        Alert.alert(
          "User Already Exists",
          "An account with this email already exists. Please log in.",
          [{ text: "OK", onPress: () => router.replace("/login") }]
        );
        return;
      } else if (firebaseError.code === "auth/invalid-email") {
        Alert.alert("Error", "The email address is not valid.");
      } else {
        Alert.alert("Error", firebaseError.message);
      }

      setError(firebaseError.message);
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {/* Top Appbar */}
          <Appbar.Header style={styles.header}>
            <Appbar.BackAction onPress={() => router.back()} color="#fff" />
            <Appbar.Content
              title="New Account"
              titleStyle={styles.titleStyle}
            />
          </Appbar.Header>
          

          <FlatList
            data={[{}]} // Use a single-item list to render your UI
            renderItem={() => (
              <>
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
                    <CustomInput
                      value={countryCode}
                      onChangeText={setCountryCode}
                    />
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
                <View style={{ minHeight: 48 }}></View>
              </>
            )}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.scrollContainer}
          />

          {/* Save Button */}
          {/* Fixed button at bottom */}
      <View style={styles.footer}>
          <CustomButton
            onPress={handleRegister}
            title={"Register"}
            style={{ backgroundColor: "#2196F3"}}
          />
          </View>
        </View>

        
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
  header: { backgroundColor: "#2196F3" },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  title: {
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 20,
    paddingVertical: 5,
  },
  radioGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioLabel: {
    fontSize: 16,
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 10,
  },
  scrollContainer: { padding: 16 },
  cardview: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    elevation: 4, // For shadow on Android
    shadowColor: "#000", // For shadow on iOS
    shadowOffset: { width: 0, height: 2 }, // For shadow on iOS
    shadowOpacity: 0.1, // For shadow on iOS
    shadowRadius: 4, // For shadow on iOS
    borderWidth: 1, // Optional for outline
    borderColor: "#e0e0e0", // Optional for outline
  },
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
  countryCodeInput: {
    width: 60,
    height: 40,
    textAlign: "center",
    borderRightWidth: 1,
    borderColor: "#ccc",
  },
  mobileInput: {
    flex: 1,
    height: 40,
    paddingLeft: 8,
  },
  customInputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  footer: {
  padding: 16,
  borderTopWidth: 1,
  borderColor: "#eee",
  backgroundColor: "#fff",
  bottom: 60, 
},
});
