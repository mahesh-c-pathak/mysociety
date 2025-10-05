// app/privacy-policy.tsx
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, Appbar } from "react-native-paper";
import { useRouter } from "expo-router";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      {/* Top Appbar */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content title="Privacy Policy" titleStyle={styles.titleStyle} />
      </Appbar.Header>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.paragraph}>
          myhousingsociety (&quot;us&quot;, &quot;we&quot;, or &quot;our&quot;)
          operates the website and the myhousingsociety mobile application (the
          &quot;Service&quot;).
        </Text>

        <Text style={styles.paragraph}>
          This page informs you of our policies regarding the collection, use,
          and disclosure of personal data when you use our Service and the
          choices you have associated with that data.
        </Text>

        <Text style={styles.subheading}>Information Collection And Use</Text>
        <Text style={styles.paragraph}>
          We collect several different types of information for various purposes
          to provide and improve our Service to you.
        </Text>

        <Text style={styles.subheading}>Types of Data Collected</Text>
        <Text style={styles.smallheading}>Personal Data</Text>
        <Text style={styles.paragraph}>
          While using our Service, we may ask you to provide us with certain
          personally identifiable information that can be used to contact or
          identify you (&quot;Personal Data&quot;). Personally identifiable
          information may include, but is not limited to:
          {"\n\n"}• Email address{"\n"}• First name and last name{"\n"}• Phone
          number{"\n"}• Address, State, Province, ZIP/Postal code, City{"\n"}•
          Cookies and Usage Data
        </Text>

        <Text style={styles.smallheading}>Usage Data</Text>
        <Text style={styles.paragraph}>
          We may also collect information that your browser sends whenever you
          visit our Service or when you access the Service by or through a
          mobile device (&quot;Usage Data&quot;).
        </Text>

        <Text style={styles.subheading}>Payments</Text>
        <Text style={styles.paragraph}>
          We provide paid products and/or services within the Service. In that
          case, we use third-party services for payment processing (e.g.,
          PhonePe).
          {"\n\n"}We will not store or collect your payment card details, UPI
          PIN, or banking credentials. That information is provided directly to
          our third-party payment processors whose use of your personal
          information is governed by their Privacy Policy.
          {"\n\n"}PhonePe adheres to the PCI-DSS standards and other security
          measures set by the Reserve Bank of India to ensure the secure
          handling of payment information.
          {"\n\n"}You can read PhonePe&apos;s Privacy Policy at:{" "}
          https://www.phonepe.com/privacy-policy/
        </Text>

        <Text style={styles.subheading}>Security Of Data</Text>
        <Text style={styles.paragraph}>
          The security of your data is important to us, but remember that no
          method of transmission over the Internet, or method of electronic
          storage is 100% secure. While we strive to use commercially acceptable
          means to protect your Personal Data, we cannot guarantee its absolute
          security.
        </Text>

        <Text style={styles.subheading}>Children&apos;s Privacy</Text>
        <Text style={styles.paragraph}>
          Our Service does not address anyone under the age of 18
          (&quot;Children&quot;). We do not knowingly collect personally
          identifiable information from anyone under the age of 18. If you are a
          parent or guardian and you are aware that your child has provided us
          with Personal Data, please contact us.
        </Text>

        <Text style={styles.subheading}>Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy, please contact
          us:
          {"\n\n"}• By email: support@myhousingsociety.in
          {"\n"}• By visiting this page on our website: www.myhousingsociety.in
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: { backgroundColor: "#6200ee" },
  titleStyle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subheading: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  smallheading: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
});
