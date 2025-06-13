import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

const Layout = () => (
  <Tabs
    initialRouteName="home"
    screenOptions={{
      tabBarActiveTintColor: "white",
      tabBarShowLabel: false,
      tabBarStyle: {
        backgroundColor: "green",
        borderRadius: 50,
        paddingBottom: 30,
        overflow: "hidden",
        marginHorizontal: 20,
        marginBottom: 20,
        height: 60,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexDirection: "row",
        position: "absolute",
      },
    }}
  >
    <Tabs.Screen
      name="home"
      options={{
        title: "Home",
        headerShown: false,
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
        ),
      }}
    />

    <Tabs.Screen
      name="disposals"
      options={{
        title: "Disposals",
        headerShown: false,
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? "trash" : "trash-outline"} size={24} color={color} />
        ),
      }}
    />

    <Tabs.Screen
      name="chat"
      options={{
        title: "Chat",
        headerShown: false,
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? "chatbubble" : "chatbubble-outline"} size={24} color={color} />
        ),
      }}
    />

    <Tabs.Screen
      name="profile"
      options={{
        title: "Profile",
        headerShown: false,
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
        ),
      }}
    />
  </Tabs>
);

export default Layout;
