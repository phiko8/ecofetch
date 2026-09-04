import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { fetchAPI } from "@/lib/fetch";

const DriverLayout = () => {
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    fetchAPI(`/(api)/user?clerkId=${user.id}`)
      .then((res) => setStatus(res?.data?.status ?? "pending"))
      .catch(() => setStatus("pending"))
      .finally(() => setChecking(false));
  }, [isLoaded, user?.id]);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  if (status !== "approved") {
    return <Redirect href="/" />;
  }

  return (
  <Tabs
    initialRouteName="dashboard"
    screenOptions={{
      tabBarActiveTintColor: "white",
      tabBarShowLabel: false,
      tabBarStyle: {
        backgroundColor: "#F97316",
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
      name="dashboard"
      options={{
        title: "Dashboard",
        headerShown: false,
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? "speedometer" : "speedometer-outline"} size={24} color={color} />
        ),
      }}
    />
    <Tabs.Screen
      name="jobs"
      options={{
        title: "Jobs",
        headerShown: false,
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={24} color={color} />
        ),
      }}
    />
    <Tabs.Screen
      name="earnings"
      options={{
        title: "Earnings",
        headerShown: false,
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? "wallet" : "wallet-outline"} size={24} color={color} />
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
};

export default DriverLayout;
