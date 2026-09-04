import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import bin2 from "@/assets/images/bin2.png";

const ROLE_KEY = "eco_last_role";

type Role = "disposer" | "driver";

const ROLES: {
  key: Role;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}[] = [
  {
    key: "disposer",
    icon: "trash-outline",
    title: "Disposer",
    description: "I need waste collected from my location. Book trusted collectors near me.",
  },
  {
    key: "driver",
    icon: "car-outline",
    title: "Collector / Driver",
    description: "I collect and dispose of waste for others. Earn by completing pickups.",
  },
];

const ACCENT: Record<Role, string> = {
  driver: "#F97316",
  disposer: "#1AB045",
};

const RoleSelect = () => {
  const [selected, setSelected] = useState<Role | null>(null);

  // Load previously saved role on mount
  useEffect(() => {
    SecureStore.getItemAsync(ROLE_KEY).then((saved) => {
      if (saved === "driver" || saved === "disposer") {
        setSelected(saved);
      }
    });
  }, []);

  const handleContinue = () => {
    if (!selected) return;
    SecureStore.setItemAsync(ROLE_KEY, selected);
    if (selected === "driver") {
      router.push("/(auth)/driver-register");
    } else {
      router.push({ pathname: "/(auth)/sign-up", params: { role: "disposer" } });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo Banner */}
      <View style={styles.banner}>
        <Image source={bin2} style={styles.bannerImage} />
      </View>

      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Choose your role</Text>
          <Text style={styles.subtitle}>
            Tell us how you will use{" "}
            <Text style={styles.brand}>
              Ec<Text style={styles.brandGreen}>o</Text> F
              <Text style={styles.brandGreen}>etch</Text>
            </Text>
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.cardsContainer}>
          {ROLES.map((role) => {
            const isActive = selected === role.key;
            const accent = ACCENT[role.key];
            return (
              <TouchableOpacity
                key={role.key}
                style={[
                  styles.card,
                  isActive && { borderColor: accent, backgroundColor: role.key === "driver" ? "#FFF7ED" : "#F0FDF4" },
                ]}
                onPress={() => setSelected(role.key)}
                activeOpacity={0.85}
              >
                {/* Check indicator */}
                <View
                  style={[
                    styles.checkCircle,
                    isActive && { backgroundColor: accent, borderColor: accent },
                  ]}
                >
                  {isActive && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>

                {/* Icon */}
                <View
                  style={[
                    styles.iconCircle,
                    isActive && { backgroundColor: accent },
                  ]}
                >
                  <Ionicons
                    name={role.icon}
                    size={36}
                    color={isActive ? "#fff" : "#9CA3AF"}
                  />
                </View>

                {/* Text */}
                <Text style={[
                  styles.cardTitle,
                  isActive && { color: role.key === "driver" ? "#9A3412" : "#065F46" },
                ]}>
                  {role.title}
                </Text>
                <Text style={styles.cardDesc}>{role.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={[
            styles.continueBtn,
            selected
              ? { backgroundColor: ACCENT[selected] }
              : styles.continueBtnDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>

        {/* Back to sign in */}
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => {
            if (selected) SecureStore.setItemAsync(ROLE_KEY, selected);
            if (selected === "driver") {
              router.push("/(auth)/driver-login");
            } else {
              router.push("/(auth)/sign-in");
            }
          }}
        >
          <Text style={styles.backLinkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  banner: {
    width: "100%",
    height: 130,
    backgroundColor: "#fff",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerBlock: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    color: "#111",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
  },
  brand: {
    fontWeight: "700",
    color: "#111",
  },
  brandGreen: {
    color: "#1AB045",
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
  },
  checkCircle: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },
  continueBtn: {
    backgroundColor: "#1AB045",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  continueBtnDisabled: {
    backgroundColor: "#D1FAE5",
  },
  continueBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  backLink: {
    alignItems: "center",
  },
  backLinkText: {
    fontSize: 14,
    color: "#6B7280",
  },
});

export default RoleSelect;
