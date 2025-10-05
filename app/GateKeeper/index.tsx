import React, { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  MaterialCommunityIcons,
  Feather,
  SimpleLineIcons,
} from "@expo/vector-icons";
import { useSociety } from "@/utils/SocietyContext";

const Dashboard = () => {
  const router = useRouter();
  const { role, societyName: societyNameParam } = useLocalSearchParams();
  const { societyName, setSocietyName } = useSociety();

  useEffect(() => {
    if (societyNameParam) {
      setSocietyName(societyNameParam as string); // Update context value
    }
  }, [societyNameParam]);

  // Dashboard items
  const sections = [
    {
      title: "Entry Mode",
      items: [
        {
          name: "New Visitor",
          icon: "login",
          route: "/GateKeeper/Entry/newVisitor",
        },
        {
          name: "Staff Entry",
          icon: "account-group",
          route: "/GateKeeper/Entry/staffEntry",
        },
        {
          name: "Gate Pass",
          icon: "ticket-confirmation",
          route: "/GateKeeper/Entry/gatePassHome",
        },
        {
          name: "Society Work",
          icon: "account-hard-hat",
          route: "/GateKeeper/Entry/societyWorkVisitor",
        },
        { name: "QR Entry", icon: "qrcode-scan", route: "/qr-entry" },
        {
          name: "Visitor Queue",
          icon: "clock-outline",
          route: "/visitor-queue",
        },
      ],
    },
    {
      title: "Exit Mode",
      items: [
        {
          name: "Visitor Exit",
          icon: "exit-to-app",
          route: "/GateKeeper/Exit/visitorExit",
        },
        {
          name: "Staff Exit",
          icon: "logout",
          route: "/GateKeeper/Exit/staffExit",
        },
      ],
    },
    {
      title: "Directory",
      items: [
        {
          name: "Visitor History",
          icon: "history",
          route: "/GateKeeper/VisitorHistroy/visitorHistory",
        },
        {
          name: "Society Members",
          icon: "account-multiple",
          route: "/society-members",
        },
        { name: "Vehicles", icon: "car", route: "/vehicles" },
        { name: "Directory", icon: "phone", route: "/directory" },
        { name: "Tasks", icon: "clipboard-list", route: "/tasks" },
      ],
    },
  ];

  return (
    <ScrollView style={{ flex: 1, padding: 10, backgroundColor: "#F5F5F5" }}>
      {/* Top Bar */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 10,
          backgroundColor: "white",
          borderRadius: 10,
          marginBottom: 10,
        }}
      >
        <Button icon="menu-down">Amarjeet</Button>
        <Feather name="bell" size={24} color="black" />
      </View>

      {/* Sections */}
      {sections.map((section, index) => (
        <Card key={index} style={{ marginBottom: 15, padding: 10 }}>
          <Text variant="titleMedium" style={{ marginBottom: 10 }}>
            {section.title}
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "flex-start", // Ensures alignment from left
            }}
          >
            {section.items.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
                style={{
                  width: "25%", // Ensures 4 icons per row
                  alignItems: "center",
                  marginVertical: 10,
                }}
              >
                {["Visitor Exit", "Staff Exit"].includes(item.name) ? (
                  <SimpleLineIcons name="logout" size={32} color="black" />
                ) : (
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={32}
                    color="black"
                  />
                )}
                <Text
                  style={{ fontSize: 12, textAlign: "center", marginTop: 5 }}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
};

export default Dashboard;
