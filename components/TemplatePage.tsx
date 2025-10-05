import { View, StyleSheet } from "react-native";
import { Appbar, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";

type TemplatePageProps = {
  title: string;
  children: React.ReactNode;
  showBack?: boolean;
  actions?: { icon: string; onPress: () => void }[];
};

export default function TemplatePage({
  title,
  children,
  showBack = false,
  actions = [],
}: TemplatePageProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        {showBack && <Appbar.BackAction onPress={() => router.back()} color="white" />}
        <Appbar.Content title={title} titleStyle={{ color: "white" }} />
        {actions.map((action, index) => (
          <Appbar.Action
            key={index}
            icon={action.icon}
            onPress={action.onPress}
            color="white"
          />
        ))}
      </Appbar.Header>

      <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16 },
});
