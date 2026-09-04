import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";

const Layout = () => {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/welcome" />;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="find-collector" options={{ headerShown: false }} />
      <Stack.Screen name="confirm-collector" options={{ headerShown: false }} />
      <Stack.Screen name="book-collector" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="driver-detail" options={{ headerShown: false }} />
      <Stack.Screen name="track-collector" options={{ headerShown: false }} />
      <Stack.Screen name="driver-tracking" options={{ headerShown: false }} />
      <Stack.Screen name="(driver-tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="bin-cleaning" options={{ headerShown: false }} />
    </Stack>
  );
};

export default Layout;
