import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
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
import { fetchAPI } from "@/lib/fetch";

const BLUE = "#F97316";

type ResetStep = "idle" | "id" | "code" | "success";

/** Returns true for a 13-digit SA ID or a 6-20 char alphanumeric passport. */
function isValidIdOrPassport(raw: string) {
  const v = raw.replace(/\s/g, "");
  return /^\d{13}$/.test(v) || /^[A-Za-z0-9]{6,20}$/.test(v);
}

export default function DriverLogin() {
  const { signIn, setActive, isLoaded } = useSignIn();

  const [idNumber, setIdNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill saved ID on mount
  useEffect(() => {
    SecureStore.getItemAsync("eco_last_driver_id").then((saved) => {
      if (saved) setIdNumber(saved);
    });
  }, []);

  // Reset state
  const [resetStep, setResetStep] = useState<ResetStep>("idle");
  const [resetId, setResetId] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const onLogin = async () => {
    if (!isLoaded) return;
    if (!idNumber.trim()) {
      setError("Please enter your SA ID or passport number.");
      return;
    }
    if (!isValidIdOrPassport(idNumber)) {
      setError("Enter a valid 13-digit SA ID or passport number (6–20 characters).");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetchAPI(
        `/(api)/driver-register?idNumber=${idNumber.trim()}`,
      );
      if (!res?.data?.email) {
        setError("No collector account found for this ID / passport number.");
        return;
      }
      const attempt = await signIn.create({
        identifier: res.data.email,
        password,
      });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        await SecureStore.setItemAsync("eco_last_driver_id", idNumber.trim());
        await SecureStore.setItemAsync("eco_last_role", "driver");
        router.replace("/(root)/(driver-tabs)/dashboard");
      } else {
        setError("Sign in incomplete. Please try again.");
      }
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.message ||
          err?.message ||
          "Invalid ID / passport or password.",
      );
    } finally {
      setLoading(false);
    }
  };

  const onSendResetCode = async () => {
    if (!isLoaded) return;
    if (!resetId.trim()) {
      setResetError("Please enter your SA ID or passport number.");
      return;
    }
    if (!isValidIdOrPassport(resetId)) {
      setResetError("Enter a valid 13-digit SA ID or passport number (6–20 characters).");
      return;
    }
    setResetLoading(true);
    setResetError("");
    try {
      const res = await fetchAPI(
        `/(api)/driver-register?idNumber=${resetId.trim()}`,
      );
      if (!res?.data?.email) {
        setResetError("No account found for this ID / passport number.");
        return;
      }
      const email = res.data.email as string;
      setResetEmail(email);
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setResetStep("code");
    } catch (err: any) {
      setResetError(
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        "Failed to send reset code. Try again."
      );
    } finally {
      setResetLoading(false);
    }
  };

  const onConfirmReset = async () => {
    if (!isLoaded) return;
    const code = resetCode.trim();
    if (!code) {
      setResetError("Please enter the 6-digit reset code.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setResetError("The reset code must be exactly 6 digits.");
      return;
    }
    if (newPassword.length < 8) {
      setResetError("New password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setResetError("Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setResetError("Password must contain at least one number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }
    setResetLoading(true);
    setResetError("");
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
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
    setResetId("");
    setResetCode("");
    setNewPassword("");
    setConfirmPassword("");
    setResetError("");
    setResetEmail("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Banner — full-width, logo centred */}
          <View style={styles.banner}>
            <Image source={bin2} style={styles.bannerImage} />
            {/* Back → role-select (works even after cache redirect) */}
            <TouchableOpacity
              onPress={() => router.replace("/(auth)/role-select")}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color="#111" />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Collector Login</Text>
            <Text style={styles.subtitle}>
              Enter your SA ID / Passport and password to access your dashboard.
            </Text>

            <CustomInput
              label="SA ID / Passport Number"
              placeholder="13-digit ID or passport number"
              icon="card-outline"
              value={idNumber}
              onChangeText={setIdNumber}
            />
            <CustomInput
              label="Password"
              placeholder="Enter your password"
              icon="lock-closed-outline"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              onPress={() => { setResetStep("id"); setResetId(idNumber); }}
              style={styles.forgotRow}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <CustomButton
              title={loading ? "Signing in..." : "Sign In"}
              onPress={onLogin}
              customStyle={[styles.btn, { backgroundColor: BLUE }]}
            />

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => router.replace("/(auth)/driver-register")}
            >
              <Text style={styles.registerLinkText}>
                Don't have an account?{" "}
                <Text style={{ color: BLUE, fontWeight: "700" }}>Register here</Text>
              </Text>
            </TouchableOpacity>
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
              <View style={styles.modalIconWrap}>
                <Ionicons name="checkmark-circle" size={40} color="#1AB045" />
              </View>
              <Text style={styles.modalTitle}>Password Updated!</Text>
              <Text style={styles.modalSub}>
                You're now signed in with your new password.
              </Text>
              <CustomButton
                title="Go to Dashboard"
                onPress={() => {
                  closeReset();
                  router.replace("/(root)/(driver-tabs)/dashboard");
                }}
                customStyle={{ marginTop: 20, backgroundColor: BLUE }}
              />
            </>

          ) : resetStep === "code" ? (
            <>
              <Text style={styles.modalTitle}>Enter Reset Code</Text>
              <Text style={styles.modalSub}>
                We sent a 6-digit code to {resetEmail}. Enter it below along with your new password.
              </Text>

              <CustomInput
                label="6-Digit Reset Code"
                placeholder="e.g. 123456"
                icon="key-outline"
                keyboardType="number-pad"
                value={resetCode}
                onChangeText={(t) => setResetCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
              />

              {/* Password rules hint */}
              <View style={styles.rulesBox}>
                <Text style={styles.rulesTitle}>Password requirements:</Text>
                {[
                  { ok: newPassword.length >= 8,        text: "At least 8 characters" },
                  { ok: /[A-Z]/.test(newPassword),      text: "One uppercase letter" },
                  { ok: /[0-9]/.test(newPassword),      text: "One number" },
                  { ok: newPassword === confirmPassword && confirmPassword.length > 0, text: "Passwords match" },
                ].map(({ ok, text }) => (
                  <View key={text} style={styles.ruleRow}>
                    <Ionicons
                      name={ok ? "checkmark-circle" : "ellipse-outline"}
                      size={14}
                      color={ok ? "#1AB045" : "#9CA3AF"}
                    />
                    <Text style={[styles.ruleText, { color: ok ? "#1AB045" : "#6B7280" }]}>
                      {text}
                    </Text>
                  </View>
                ))}
              </View>

              <CustomInput
                label="New Password"
                placeholder="At least 8 characters"
                secureTextEntry
                icon="lock-closed-outline"
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <CustomInput
                label="Confirm New Password"
                placeholder="Re-enter your new password"
                secureTextEntry
                icon="lock-closed-outline"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              {resetError ? <Text style={styles.modalError}>{resetError}</Text> : null}
              {resetLoading ? (
                <ActivityIndicator style={{ marginTop: 16 }} color={BLUE} />
              ) : (
                <CustomButton
                  title="Reset Password"
                  onPress={onConfirmReset}
                  customStyle={{ marginTop: 8, backgroundColor: BLUE }}
                />
              )}
              <TouchableOpacity onPress={() => setResetStep("id")} style={styles.backLink}>
                <Text style={[styles.backLinkText, { color: BLUE }]}>← Change ID</Text>
              </TouchableOpacity>
            </>

          ) : (
            <>
              <Text style={styles.modalTitle}>Forgot Password?</Text>
              <Text style={styles.modalSub}>
                Enter your SA ID or passport number to receive a reset code via email.
              </Text>
              <CustomInput
                label="SA ID / Passport Number"
                placeholder="13-digit ID or passport number"
                icon="card-outline"
                value={resetId}
                onChangeText={setResetId}
              />
              {resetError ? <Text style={styles.modalError}>{resetError}</Text> : null}
              {resetLoading ? (
                <ActivityIndicator style={{ marginTop: 16 }} color={BLUE} />
              ) : (
                <CustomButton
                  title="Send Code"
                  onPress={onSendResetCode}
                  customStyle={{ marginTop: 8, backgroundColor: BLUE }}
                />
              )}
              <TouchableOpacity onPress={closeReset} style={styles.backLink}>
                <Text style={[styles.backLinkText, { color: BLUE }]}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ReactNativeModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  scroll: { paddingBottom: 40 },

  /* Banner — no horizontal padding so it's truly full-width */
  banner: {
    width: "100%",
    height: 130,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bannerImage: {
    width: "80%",
    height: "100%",
    resizeMode: "contain",
    alignSelf: "center",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  /* Form area has its own padding */
  form: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: -6,
    marginBottom: 12,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
    color: BLUE,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    marginTop: 6,
    marginBottom: 4,
    textAlign: "center",
  },
  btn: { marginTop: 20 },
  registerLink: { alignItems: "center", marginTop: 28 },
  registerLinkText: { fontSize: 14, color: "#6B7280" },

  /* Password rules */
  rulesBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 6,
  },
  rulesTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ruleText: {
    fontSize: 12,
  },

  /* Modal */
  modal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#D1FAE5",
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
