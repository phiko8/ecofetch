import { useOAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { icons } from "@/constants";
import { googleOAuth } from "@/lib/auth";

const OAuth = () => {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  const handleGoogleSignIn = async () => {
    try {
      const result = await googleOAuth(startOAuthFlow, "disposer");

      if (result.success) {
        // Let index.tsx read the DB role and route correctly
        router.replace("/");
      } else {
        Alert.alert("Error", result.message ?? "Google sign-in failed.");
      }
    } catch (error) {
      console.error("Google sign-in failed:", error);
      Alert.alert("Error", "Something went wrong during sign-in.");
    }
  };

  return (
    <View>
      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>Or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Google button */}
      <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn} activeOpacity={0.8}>
        <Image source={icons.google} style={styles.googleIcon} resizeMode="contain" />
        <Text style={styles.googleBtnText}>Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    fontSize: 15,
    color: "#6B7280",
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
    backgroundColor: "#fff",
    gap: 10,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
});

export default OAuth;
