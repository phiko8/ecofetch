import { useSignUp } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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

export default function DriverRegister() {
  const { signUp, isLoaded, setActive } = useSignUp();

  const [fullName, setFullName] = useState("");
  const [idType, setIdType] = useState<"id" | "passport">("id");
  const [idNumber, setIdNumber] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [numberPlate, setNumberPlate] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [success, setSuccess] = useState(false);

  const onRegister = async () => {
    if (!isLoaded) return;
    const docValue = idType === "id" ? idNumber : passportNumber;
    if (!fullName || !docValue || !email || !phone || !vehicleType || !licenseNumber || !numberPlate || !password) {
      setError("Please fill in all required fields (marked with *).");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    const phoneRegex = /^(\+27|0)[6-8][0-9]{8}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
      setError("Please enter a valid South African phone number.");
      return;
    }
    if (idType === "id" && idNumber.replace(/\s/g, "").length !== 13) {
      setError("ID number must be 13 digits.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      const clerkErr = err?.errors?.[0];
      const field = clerkErr?.meta?.paramName?.replace(/_/g, " ") ?? "";
      const detail = clerkErr?.longMessage || clerkErr?.message || "";
      setError(
        detail
          ? field ? `${field}: ${detail}` : detail
          : "Registration failed. This email may already be in use.",
      );
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setVerifyError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await fetchAPI("/(api)/driver-register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName,
            idNumber: idType === "id" ? idNumber.trim() : null,
            passportNumber: idType === "passport" ? passportNumber.trim() : null,
            email,
            phone: phone.trim(),
            vehicleType: vehicleType.trim(),
            licenseNumber: licenseNumber.trim(),
            numberPlate: numberPlate.trim().toUpperCase(),
            clerkId: result.createdUserId,
          }),
        });
        await setActive({ session: result.createdSessionId });
        setSuccess(true);
      } else {
        setVerifyError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      setVerifyError(
        err?.errors?.[0]?.longMessage ||
          err?.message ||
          "Verification failed. Check the code and try again.",
      );
    } finally {
      setLoading(false);
    }
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
          showsVerticalScrollIndicator={false}
        >
          {/* Banner */}
          <View style={styles.banner}>
            <Image source={bin2} style={styles.bannerImage} />
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#111" />
            </TouchableOpacity>
          </View>

          {/* Role badge */}
          <View style={styles.badge}>
            <Ionicons name="car-outline" size={15} color={BLUE} />
            <Text style={styles.badgeText}>Collector / Driver</Text>
          </View>

          <Text style={styles.title}>Create Collector Account</Text>
          <Text style={styles.subtitle}>
            You will use your ID number to log in — no email needed after registration.
          </Text>

          {!pendingVerification ? (
            <>
              <CustomInput
                label="Full Name *"
                placeholder="Enter your full name"
                icon="person-outline"
                value={fullName}
                onChangeText={setFullName}
              />
              <Text style={styles.inputLabel}>Document Type *</Text>
              <View style={styles.docToggle}>
                <TouchableOpacity
                  style={[styles.docToggleBtn, idType === "id" && styles.docToggleActive]}
                  onPress={() => { setIdType("id"); setPassportNumber(""); }}
                >
                  <Text style={[styles.docToggleTxt, idType === "id" && styles.docToggleActiveTxt]}>SA ID</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.docToggleBtn, idType === "passport" && styles.docToggleActive]}
                  onPress={() => { setIdType("passport"); setIdNumber(""); }}
                >
                  <Text style={[styles.docToggleTxt, idType === "passport" && styles.docToggleActiveTxt]}>Passport</Text>
                </TouchableOpacity>
              </View>

              {idType === "id" ? (
                <CustomInput
                  label="ID Number *"
                  placeholder="e.g. 9001015009087"
                  icon="card-outline"
                  value={idNumber}
                  onChangeText={setIdNumber}
                  keyboardType="number-pad"
                />
              ) : (
                <CustomInput
                  label="Passport Number *"
                  placeholder="e.g. A12345678"
                  icon="reader-outline"
                  value={passportNumber}
                  onChangeText={setPassportNumber}
                />
              )}
              <CustomInput
                label="Email Address *"
                placeholder="Used for account verification only"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
              <CustomInput
                label="Phone Number *"
                placeholder="e.g. 0812345678"
                icon="call-outline"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <CustomInput
                label="Vehicle Type *"
                placeholder="e.g. Bakkie, Truck, Van"
                icon="car-sport-outline"
                value={vehicleType}
                onChangeText={setVehicleType}
              />
              <CustomInput
                label="License Number *"
                placeholder="e.g. PDP1234567"
                icon="document-text-outline"
                value={licenseNumber}
                onChangeText={setLicenseNumber}
              />
              <CustomInput
                label="Number Plate *"
                placeholder="e.g. GP 123-456"
                icon="car-outline"
                value={numberPlate}
                onChangeText={setNumberPlate}
              />

              <CustomInput
                label="Password *"
                placeholder="Create a strong password"
                icon="lock-closed-outline"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <CustomButton
                title={loading ? "Registering..." : "Register as Collector"}
                onPress={onRegister}
                customStyle={[styles.btn, { backgroundColor: BLUE }]}
              />
            </>
          ) : (
            <>
              <View style={styles.verifyBox}>
                <Ionicons name="mail-outline" size={28} color={BLUE} />
                <Text style={styles.verifyTitle}>Check your email</Text>
                <Text style={styles.verifyNote}>
                  We sent a verification code to {email}
                </Text>
              </View>

              <CustomInput
                label="Verification Code"
                placeholder="Enter the 6-digit code"
                icon="key-outline"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
              />
              {!!verifyError && <Text style={styles.errorText}>{verifyError}</Text>}

              <CustomButton
                title={loading ? "Verifying..." : "Verify & Complete Registration"}
                onPress={onVerify}
                customStyle={[styles.btn, { backgroundColor: BLUE }]}
              />
            </>
          )}

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace("/(auth)/driver-login")}
          >
            <Text style={styles.loginLinkText}>
              Already registered?{" "}
              <Text style={{ color: BLUE, fontWeight: "700" }}>Log in with ID</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success modal */}
      <ReactNativeModal isVisible={success}>
        <View style={styles.modal}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={36} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Registration Successful!</Text>
          <Text style={styles.successSub}>
            Your collector account is ready.{"\n"}
            Log in anytime using your ID number.
          </Text>
          <CustomButton
            title="Go to Dashboard"
            onPress={() => router.replace("/(root)/(driver-tabs)/dashboard")}
            customStyle={[styles.btn, { backgroundColor: BLUE, marginTop: 20 }]}
          />
        </View>
      </ReactNativeModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 0 },
  banner: {
    width: "100%",
    height: 130,
    position: "relative",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
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
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F0F9",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  badgeText: { fontSize: 13, fontWeight: "700", color: BLUE },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 24,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    marginTop: 6,
    marginBottom: 4,
  },
  btn: { marginTop: 20 },
  verifyBox: {
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    padding: 24,
    marginBottom: 24,
    gap: 8,
  },
  verifyTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  verifyNote: { fontSize: 13, color: "#6B7280", textAlign: "center" },
  docToggle: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  docToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  docToggleActive: {
    backgroundColor: BLUE,
  },
  docToggleTxt: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  docToggleActiveTxt: {
    color: "#fff",
  },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#111", marginBottom: 2, marginTop: 16 },
  inputHint: { fontSize: 12, color: "#9CA3AF", marginBottom: 8 },
  loginLink: { alignItems: "center", marginTop: 28 },
  loginLinkText: { fontSize: 14, color: "#6B7280" },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
  },
  successSub: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
});
