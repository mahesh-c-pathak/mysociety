import phoneAuthStyles from "@/styles/phoneAuthStyles";
import { SvgXml } from "react-native-svg";
import phone from "@/assets/icons/svg/phone";
import { ICON_SIZE } from "@/constants/constants";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

// Functional component
const Login = () => {
  const router = useRouter();

  // Method to open url
  const _openSignInURL = () => {
    router.push("/admin/Signin");
  };

  // Returning JSX
  return (
    <View style={phoneAuthStyles.mainWrapper}>
      <View style={phoneAuthStyles.contentWrapper}>
        {/* Heading */}
        <Text style={phoneAuthStyles.actionHeading}>Try Sign In Demo</Text>

        {/* Info */}
        <Text style={phoneAuthStyles.actionInfo}>
          Below button demonstrate the usage of Sign In button
        </Text>

        {/* Button */}
        <TouchableOpacity
          style={phoneAuthStyles.button}
          onPress={_openSignInURL}
        >
          {/* Phone icon */}
          <SvgXml xml={phone} width={ICON_SIZE} height={ICON_SIZE} />

          {/* Button label */}
          <Text style={phoneAuthStyles.buttonLabel}>sign in with phone</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Exporting component
export default Login;
