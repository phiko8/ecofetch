import { Stack } from "expo-router";

// No isSignedIn redirect here — index.tsx owns all auth-state routing decisions.
// Having a <Redirect href="/" /> here races with index.tsx during sign-out
// (both fire simultaneously → React Navigation crash).
const Layout = () => {
  return (
    <Stack>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="role-select" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="driver-register" options={{ headerShown: false }} />
      <Stack.Screen name="driver-login" options={{ headerShown: false }} />
      <Stack.Screen name="driver-complete" options={{ headerShown: false }} />
    </Stack>
  );
};

export default Layout;
