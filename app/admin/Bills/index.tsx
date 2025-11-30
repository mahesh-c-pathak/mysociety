import React from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";

import { useRouter, Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppbarComponent from "../../../components/AppbarComponent";
import { useCustomBackHandler } from "@/utils/useCustomBackHandler";

type Option = {
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap; // Enforce valid icon names
  route: string; // Ensure the route starts with "/"
};

const BillsScreen = () => {
  const router = useRouter();
  useCustomBackHandler("/admin"); // back always goes to Screen3

  const options: Option[] = [
    {
      title: "Generate Maintenance Bills",
      description:
        "Create/view routine maintenance bills for utilities such as water and general maintenance for all society members or for a specific society wing.",
      icon: "file-document-outline",
      route: "/admin/Bills/Maintenance",
    },
    {
      title: "Generate Special Bills",
      description:
        "Create/view special situation bills/penalty challans for a specific society member for breaking rules, parking charges, facility booking charges, etc.",
      icon: "file-alert-outline",
      route: "/admin/Bills/SpecialBills",
    },
    {
      title: "Bill Collection Status",
      description:
        "Check total unpaid bill amount with detailed graphical information about defaults by individuals and generate invoices in a single click.",
      icon: "chart-bar",
      route: "/bill-collection-status",
    },
    {
      title: "Payment Receipt Summary",
      description: "Check receipt summary by month-wise.",
      icon: "receipt",
      route: "/payment-receipt-summary",
    },
    {
      title: "Print Bills",
      description:
        "Print bills easily by downloading all maintenance and other bills in the form of a single PDF file.",
      icon: "printer",
      route: "/print-bills",
    },
    {
      title: "Download Member Dues & Payment Receipts Record",
      description:
        "Download a detailed spreadsheet containing month-wise payment and receipt information of all society members.",
      icon: "download",
      route: "/download-dues-record",
    },
    {
      title: "Settings",
      description: "Set Bill Instruction content text.",
      icon: "cog-outline",
      route: "/settings",
    },
  ];

  return (
    <View style={styles.container}>
      {/* Top Appbar */}
      <AppbarComponent title="Bills" source="Admin" backRoute="/admin" />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            onPress={() => router.push(option.route as Href)}
          >
            <View style={styles.cardContent}>
              <MaterialCommunityIcons
                name={option.icon}
                size={30}
                style={styles.icon}
              />
              <View style={styles.textContainer}>
                <Text style={styles.title}>{option.title}</Text>
                <Text style={styles.description}>{option.description}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  scrollContainer: {
    paddingHorizontal: 10,
    paddingVertical: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
    marginBottom: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: "#666",
  },
});

export default BillsScreen;
