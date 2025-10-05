// app/terms.tsx
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, Divider, Appbar } from "react-native-paper";
import { useRouter } from "expo-router";

export default function TermsScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      {/* Top Appbar */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content
          title="Terms and Conditions"
          titleStyle={styles.titleStyle}
        />
      </Appbar.Header>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.text}>Effective Date: [Insert Date]</Text>

        <Divider style={styles.divider} />

        <Text style={styles.paragraph}>
          These Terms and Conditions (&quot;Terms&quot;, &quot;Agreement&quot;)
          are an agreement between{" "}
          <Text style={styles.bold}>myhousingsociety</Text>
          (&quot;us&quot;, &quot;we&quot;) and you (&quot;User&quot;,
          &quot;you&quot;). This Agreement sets forth the terms of your use of
          the myhousingsociety mobile application and its services.
        </Text>

        <Section title="Acceptance of Terms">
          <Text style={styles.paragraph}>
            By accessing or using our Mobile Application and Services, you agree
            to be bound by these Terms. If you do not agree, you are not
            authorized to use the Services.
          </Text>
        </Section>

        <Section title="Our Services">
          <Text style={styles.paragraph}>
            The app provides features including but not limited to: society
            communication, notices, payments, complaints, and other community
            services.
          </Text>
          <Text style={styles.paragraph}>
            Our Services may contain links to third-party websites or services.
            We are not responsible for the content, privacy policies, or
            practices of third-party sites.
          </Text>
        </Section>

        <Section title="Access and Use">
          <Text style={styles.paragraph}>
            You agree not to resell, copy, reverse-engineer, or misuse the
            Services. Collecting personal information of other users without
            consent is prohibited.
          </Text>
        </Section>

        <Section title="Payments">
          <Text style={styles.paragraph}>
            Payments are securely processed through{" "}
            <Text style={styles.bold}>PhonePe</Text>. We do not store sensitive
            payment credentials (e.g., UPI PINs, card details).
          </Text>
          <Text style={styles.paragraph}>
            By making a payment, you also agree to PhonePe&apos;s Terms and
            Privacy Policy.
          </Text>
        </Section>

        <Section title="Refunds and Cancellations">
          <Text style={styles.paragraph}>
            • No refunds once payment is made.
          </Text>
          <Text style={styles.paragraph}>
            • Duplicate/failed transactions will be reversed as per PhonePe/bank
            policies.
          </Text>
          <Text style={styles.paragraph}>
            • Cancellations apply only to future billing cycles.
          </Text>
        </Section>

        <Section title="Trial Period">
          <Text style={styles.paragraph}>
            Trial access may be provided. After expiry, continued use requires a
            paid subscription. Trial content may be deleted if not upgraded.
          </Text>
        </Section>

        <Section title="Disclaimer of Warranties">
          <Text style={styles.paragraph}>
            Services are provided on an &quot;as is&quot; basis. We make no
            warranties regarding accuracy, reliability, or availability.
          </Text>
        </Section>

        <Section title="Limitation of Liability">
          <Text style={styles.paragraph}>
            We are not liable for indirect or incidental damages, payment
            failures by PhonePe, or loss of data/business arising from use of
            the Services.
          </Text>
        </Section>

        <Section title="Changes to Terms">
          <Text style={styles.paragraph}>
            We may update these Terms from time to time. Continued use after
            updates means you accept the changes.
          </Text>
        </Section>

        <Section title="Contact Us">
          <Text style={styles.paragraph}>
            Email: support@myhousingsociety.in
          </Text>
          <Text style={styles.paragraph}>Website: www.myhousingsociety.in</Text>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { backgroundColor: "#6200ee" },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  content: { padding: 16, paddingBottom: 80 },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  paragraph: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  bold: { fontWeight: "bold" },
  text: { fontSize: 14, marginBottom: 8 },
  divider: { marginVertical: 8 },
});
