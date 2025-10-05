import React, { useState, useEffect } from "react";
import {
  TouchableOpacity,
  Image,
  StyleSheet,
  ViewStyle,
  ImageStyle,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

interface CircularImagePickerProps {
  onImageSelected?: (imageUri: string) => void;
  buttonStyle?: ViewStyle;
  imageStyle?: ImageStyle;
  iconSize?: number;
  iconColor?: string;
  initialImage?: string; // New prop for initial image
}

const CircularImagePicker: React.FC<CircularImagePickerProps> = ({
  onImageSelected,
  buttonStyle,
  imageStyle,
  iconSize = 32,
  iconColor = "white",
  initialImage, // Receive initial image
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(
    initialImage || null
  );

  // Update state when initialImage prop changes (important for edit mode)
  useEffect(() => {
    setSelectedImage(initialImage || null);
  }, [initialImage]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need camera roll permissions to proceed!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setSelectedImage(imageUri);
      if (onImageSelected) {
        onImageSelected(imageUri); // Pass selected image to parent
      }
    }
  };

  return (
    <TouchableOpacity
      style={StyleSheet.flatten([styles.circleButton, buttonStyle])}
      onPress={pickImage}
    >
      {selectedImage ? (
        <Image
          source={{ uri: selectedImage }}
          style={StyleSheet.flatten([styles.image, imageStyle])}
        />
      ) : (
        <Ionicons name="camera" size={iconSize} color={iconColor} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  circleButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#6200ea",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
});

export default CircularImagePicker;
