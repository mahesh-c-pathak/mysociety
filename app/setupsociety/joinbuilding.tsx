// app/join-building.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Appbar } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { db } from "@/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuthRole } from "@/lib/authRole";

const JoinBuilding = () => {
  const { height } = useWindowDimensions();
  // Dynamically calculate spacing
  const spacing = height * 0.2; // 5% of screen height
  const [code, setCode] = useState("");
  const router = useRouter();
  const navigation = useNavigation();

  const { user } = useAuthRole();

  const userId = user?.uid;

  useEffect(() => {
    console.log("userId", userId);
  }, [userId]);

  useEffect(() => {
    // Dynamically hide the header for this screen
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleSubmit = async () => {
    if (!code.trim()) {
      Alert.alert("Error", "Please enter a valid building code.");
      return;
    }

    try {
      const societiesRef = collection(db, "Societies");
      const q = query(societiesRef, where("societycode", "==", code));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        let foundSocietyName = ""; // Temporary variable to store the society name

        for (const doc of querySnapshot.docs) {
          // Use for...of loop
          console.log("Society Name:", doc.id); // Logs the document ID (societyname)
          foundSocietyName = doc.id;

          // Break after finding the first match
          break;
        }

        // Navigate with the found society name
        router.push({
          pathname: "/setupsociety/joinwing",
          params: { mysocietyName: foundSocietyName },
        });
      } else {
        Alert.alert("App Code Not Found");
      }
    } catch (error) {
      console.error("Error querying Firestore:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        {/* Top Appbar */}
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => router.back()} color="#fff" />
          <Appbar.Content
            title="Join Building"
            titleStyle={styles.titleStyle}
          />
        </Appbar.Header>
        <View
          style={[
            styles.content,
            { marginTop: spacing, marginBottom: spacing },
          ]}
        >
          <Text style={styles.description}>
            Get your building code from your building administrator.
          </Text>

          <Text style={styles.label}>Enter Code</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="Enter Code"
            keyboardType="numeric"
          />

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default JoinBuilding;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#0288d1", // Match background color from the attached image
    elevation: 4,
  },
  titleStyle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    marginTop: 20,
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: "#555",
    textAlign: "left",
    marginBottom: 40,
    marginHorizontal: 20,
  },
  label: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    marginHorizontal: 80,
    marginVertical: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
