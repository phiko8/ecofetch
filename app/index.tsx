import { useAuth, useUser } from "@clerk/clerk-expo";
import { useSignOut } from "@/lib/useSignOut";
import * as SecureStore from "expo-secure-store";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import "react-native-get-random-values";
import { Ionicons } from "@expo/vector-icons";

import { fetchAPI } from "@/lib/fetch";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { performSignOut, loading: signingOut } = useSignOut();
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // null = not yet checked
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [lastRole, setLastRole] = useState<string | null | undefined>(undefined); // undefined = not yet checked

  // Check onboarding flag and last role once auth is loaded
  useEffect(() => {
    if (!isLoaded) return;
    Promise.all([
      SecureStore.getItemAsync("eco_onboarding_done"),
      SecureStore.getItemAsync("eco_last_role"),
    ]).then(([onboarding, savedRole]) => {
      setOnboardingDone(onboarding === "true");
      setLastRole(savedRole ?? null);
    });
  }, [isLoaded]);

  useEffect(() => {
    if (!isSignedIn || !user?.id) return;
    setLoading(true);
    fetchAPI(`/(api)/user?clerkId=${user.id}`)
      .then((res) => {
        const userRole = res?.data?.role ?? "disposer";
        setRole(userRole);
        setStatus(res?.data?.status ?? "pending");
        // Always keep these up-to-date so logout/re-open goes to correct sign-in
        SecureStore.setItemAsync("eco_last_role", userRole);
        SecureStore.setItemAsync("eco_onboarding_done", "true");
      })
      .catch(() => {
        setRole("disposer");
        setStatus("pending");
      })
      .finally(() => setLoading(false));
  }, [isSignedIn, user?.id]);

  // Wait for auth + SecureStore checks before rendering
  if (!isLoaded || onboardingDone === null || lastRole === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1AB045" />
      </View>
    );
  }

  if (!isSignedIn) {
    // Returning user who has logged in before — go straight to their sign-in screen
    if (lastRole === "driver") {
      return <Redirect href="/(auth)/driver-login" />;
    }
    if (lastRole === "disposer") {
      return <Redirect href={{ pathname: "/(auth)/sign-in", params: { role: "disposer" } }} />;
    }
    // Brand-new user — show onboarding once, then role-select
    return <Redirect href={onboardingDone ? "/(auth)/role-select" : "/(auth)/welcome"} />;
  }

  if (loading || !role) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1AB045" />
        <Text style={styles.loadingText}>Loading your profile…</Text>
      </View>
    );
  }

  if (role === "driver" && status !== "approved") {
    const isBanned   = status === "banned";
    const isRejected = status === "rejected";

    const iconName  = isBanned ? "ban-outline"        : isRejected ? "close-circle-outline" : "time-outline";
    const iconColor = isBanned ? "#111827"             : isRejected ? "#EF4444"              : "#D97706";
    const iconBg    = isBanned ? "#F3F4F6"             : isRejected ? "#FEE2E2"              : "#FEF3C7";
    const title     = isBanned ? "Account Banned"      : isRejected ? "Registration Rejected" : "Awaiting Approval";
    const message   = isBanned
      ? "Your account has been banned by an administrator. You cannot access this app. Contact support if you believe this is a mistake."
      : isRejected
      ? "Your driver registration was not approved. Please contact support for more information."
      : "Your driver registration is under review. You'll be able to access the app once an admin approves your account.";

    return (
      <View style={styles.pendingContainer}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={48} color={iconColor} />
        </View>
        <Text style={styles.pendingTitle}>{title}</Text>
        <Text style={styles.pendingText}>{message}</Text>
        <TouchableOpacity style={styles.signOutBtn} onPress={performSignOut} disabled={signingOut}>
          <Ionicons name={signingOut ? "hourglass-outline" : "log-out-outline"} size={18} color="#fff" />
          <Text style={styles.signOutText}>{signingOut ? "Signing out…" : "Sign Out"}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (role === "driver") {
    return <Redirect href="/(root)/(driver-tabs)/dashboard" />;
  }

  return <Redirect href="/(root)/(tabs)/home" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: "#6B7280",
  },
  pendingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 36,
    gap: 16,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  pendingTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },
  pendingText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: "#F97316",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  signOutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
