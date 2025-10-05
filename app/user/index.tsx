import TemplatePage from "../../components/TemplatePage";
import { Button, Text } from "react-native-paper";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";

export default function UserHome() {
  return (
    <TemplatePage
      title="User Dashboard"
      actions={[{ icon: "logout", onPress: () => signOut(auth) }]}
    >
      <Text>Welcome, User!</Text>
      <Button mode="contained" onPress={() => {}}>My Profile</Button>
    </TemplatePage>
  );
}
