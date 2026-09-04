import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ReactNativeModal from "react-native-modal";
import { SafeAreaView } from "react-native-safe-area-context";

import bin2 from "@/assets/images/bin2.png";
import CustomButton from "@/components/customButton";
import CustomInput from "@/components/CustomInput";
import OAuth from "@/components/oAuth";

type ResetStep = "idle" | "email" | "code" | "success";

const SignIn = () => {
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Pre-fill saved email on mount
  useEffect(() => {
    SecureStore.getItemAsync("eco_last_email").then((saved) => {
      if (saved) setEmailAddress(saved);
    });
  }, []);

  // Reset password state
  const [resetStep, setResetStep] = useState<ResetStep>("idle");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const isDriver = role === "driver";
  const accentColor = isDriver ? "#F97316" : "#1AB045";

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        // Remember email and role for next visit
        await SecureStore.setItemAsync("eco_last_email", emailAddress.trim());
        await SecureStore.setItemAsync("eco_last_role", "disposer");
        router.replace(
          role ? { pathname: "/", params: { roleOverride: role } } : "/"
        );
      } else {
        setError("Sign-in incomplete. Please try again.");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Incorrect email or password.");
    }
  };

  const onSendResetCode = async () => {
    if (!isLoaded) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail.trim())) {
      setResetError("Please enter a valid email address.");
      return;
    }
    setResetLoading(true);
    setResetError("");
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: resetEmail.trim(),
      });
      setResetStep("code");
    } catch (err: any) {
      setResetError(err?.errors?.[0]?.message || "Could not send reset code. Check the email and try again.");
    } finally {
      setResetLoading(false);
    }
  };

  const onConfirmReset = async () => {
    if (!isLoaded) return;
    if (!resetCode.trim()) {
      setResetError("Please enter the reset code.");
      return;
    }
    if (newPassword.length < 8) {
      setResetError("New password must be at least 8 characters.");
      return;
    }
    setResetLoading(true);
    setResetError("");
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode.trim(),
        password: newPassword,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setResetStep("success");
      } else {
        setResetError("Reset incomplete. Please try again.");
      }
    } catch (err: any) {
      setResetError(err?.errors?.[0]?.longMessage || "Invalid code or password too weak.");
    } finally {
      setResetLoading(false);
    }
  };

  const closeReset = () => {
    setResetStep("idle");
    setResetEmail("");
    setResetCode("");
    setNewPassword("");
    setResetError("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Banner */}
          <View style={styles.banner}>
            <Image source={bin2} style={styles.bannerImage} />
            <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/(auth)/role-select")}>
              <Ionicons name="arrow-back" size={22} color="#111" />
            </TouchableOpacity>
          </View>

          <View style={styles.roleTagRow}>
            <View style={styles.roleTag}>
              <Ionicons
                name={isDriver ? "car-outline" : "trash-outline"}
                size={16}
                color={accentColor}
              />
              <Text style={[styles.roleTagText, { color: accentColor }]}>
                {isDriver ? "Collector / Driver" : "Disposer"}
              </Text>
            </View>
          </View>

          <Text style={styles.subtitle}>
            {isDriver
              ? "Sign in to manage your collection jobs"
              : "Sign in to book waste collection"}
          </Text>

          <View style={styles.formContainer}>
            <CustomInput
              label="Email"
              placeholder="Enter your email"
              keyboardType="email-address"
              icon="mail-outline"
              value={emailAddress}
              onChangeText={setEmailAddress}
            />
            <CustomInput
              label="Password"
              placeholder="Enter your password"
              secureTextEntry
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              onPress={() => { setResetStep("email"); setResetEmail(emailAddress); }}
              style={styles.forgotRow}
            >
              <Text style={[styles.forgotText, { color: accentColor }]}>Forgot password?</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <CustomButton
              title="Sign In"
              onPress={onSignInPress}
              customStyle={[styles.button, { backgroundColor: accentColor }]}
            />

            <OAuth />

            <Link href="/sign-up" style={styles.link}>
              <Text style={styles.linkText}>Don't have an account? </Text>
              <Text style={[styles.logInText, { color: accentColor }]}>Sign up</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Forgot Password Modal ── */}
      <ReactNativeModal
        isVisible={resetStep !== "idle"}
        onBackdropPress={closeReset}
        avoidKeyboard
      >
        <View style={styles.modal}>
          {resetStep === "success" ? (
            <>
              <View style={[styles.modalIcon, { backgroundColor: "#D1FAE5" }]}>
                <Ionicons name="checkmark-circle" size={40} color="#1AB045" />
              </View>
              <Text style={styles.modalTitle}>Password Updated!</Text>
              <Text style={styles.modalSub}>You're now signed in with your new password.</Text>
              <CustomButton
                title="Continue"
                onPress={() => {
                  closeReset();
                  router.replace("/");
                }}
                customStyle={{ marginTop: 20, backgroundColor: accentColor }}
              />
            </>
          ) : resetStep === "code" ? (
            <>
              <Text style={styles.modalTitle}>Enter Reset Code</Text>
              <Text style={styles.modalSub}>
                We sent a 6-digit code to {resetEmail}. Also enter your new password below.
              </Text>
              <CustomInput
                label="Reset Code"
                placeholder="6-digit code"
                icon="key-outline"
                keyboardType="number-pad"
                value={resetCode}
                onChangeText={setResetCode}
              />
              <CustomInput
                label="New Password"
                placeholder="At least 8 characters"
                secureTextEntry
                icon="lock-closed-outline"
                value={newPassword}
                onChangeText={setNewPassword}
              />
              {resetError ? <Text style={styles.modalError}>{resetError}</Text> : null}
              <CustomButton
                title={resetLoading ? "Resetting…" : "Reset Password"}
                onPress={onConfirmReset}
                disabled={resetLoading}
                customStyle={{ marginTop: 8, backgroundColor: accentColor }}
              />
              <TouchableOpacity onPress={() => setResetStep("email")} style={styles.backLink}>
                <Text style={[styles.backLinkText, { color: accentColor }]}>← Change email</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.modalTitle}>Forgot Password?</Text>
              <Text style={styles.modalSub}>
                Enter your account email and we'll send you a reset code.
              </Text>
              <CustomInput
                label="Email"
                placeholder="Your account email"
                keyboardType="email-address"
                icon="mail-outline"
                value={resetEmail}
                onChangeText={setResetEmail}
              />
              {resetError ? <Text style={styles.modalError}>{resetError}</Text> : null}
              {resetLoading ? (
                <ActivityIndicator style={{ marginTop: 16 }} color={accentColor} />
              ) : (
                <CustomButton
                  title="Send Code"
                  onPress={onSendResetCode}
                  customStyle={{ marginTop: 8, backgroundColor: accentColor }}
                />
              )}
              <TouchableOpacity onPress={closeReset} style={styles.backLink}>
                <Text style={[styles.backLinkText, { color: accentColor }]}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ReactNativeModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    alignItems: "center",
  },
  banner: {
    width: "100%",
    height: 130,
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    top: 14,
    left: 14,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  roleTagRow: {
    alignItems: "flex-start",
    marginTop: 16,
    marginBottom: 4,
  },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F0F9",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  roleTagText: {
    fontWeight: "700",
    fontSize: 13,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 6,
    paddingHorizontal: 24,
  },
  formContainer: {
    width: "90%",
    paddingVertical: 20,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: -6,
    marginBottom: 12,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    marginBottom: 8,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
  },
  link: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  linkText: {
    fontSize: 16,
    color: "#333",
  },
  logInText: {
    fontSize: 16,
  },
  // Modal
  modal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
  },
  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  modalError: {
    color: "#EF4444",
    fontSize: 13,
    marginBottom: 8,
    textAlign: "center",
  },
  backLink: {
    alignItems: "center",
    marginTop: 16,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default SignIn;
