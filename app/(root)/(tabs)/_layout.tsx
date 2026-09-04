import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

const Layout = () => (
  <Tabs
    initialRouteName="home"
    screenOptions={{
      tabBarActiveTintColor: "white",
      tabBarShowLabel: false,
      tabBarStyle: {
        backgroundColor: "#1AB045",
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
      name="drives"
      options={{
        title: "Drives",
        headerShown: false,
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? "car" : "car-outline"} size={24} color={color} />
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
