import { Link, router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ReactNativeModal from "react-native-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import bin2 from "@/assets/images/bin2.png";
import check from "@/assets/images/check.png";
import CustomButton from "@/components/customButton";
import CustomInput from "@/components/CustomInput";
import OAuth from "@/components/oAuth";

import { fetchAPI } from "@/lib/fetch";
import { useSignUp } from "@clerk/clerk-expo";

const SignUp = () => {
  const { role } = useLocalSearchParams<{ role: string }>();
  const { signUp, isLoaded, setActive } = useSignUp();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [verification, setVerification] = useState({
    state: "default", // 'default', 'pending', 'error', 'success', 'failed'
    error: "",
    code: "",
  });

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    if (!fullName.trim()) {
      setVerification({ state: "error", error: "Please enter your full name.", code: "" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress.trim())) {
      setVerification({ state: "error", error: "Please enter a valid email address.", code: "" });
      return;
    }
    if (password.length < 8) {
      setVerification({ state: "error", error: "Password must be at least 8 characters.", code: "" });
      return;
    }

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setVerification({
        state: "pending",
        error: "",
        code: "",
      });

    } catch (err: any) {
      console.error("Sign-up error: ", err);
      const clerkErr = err?.errors?.[0];
      const field = clerkErr?.meta?.paramName?.replace(/_/g, " ") ?? "";
      const detail = clerkErr?.longMessage || clerkErr?.message || "";
      setVerification({
        state: "error",
        error: detail ? (field ? `${field}: ${detail}` : detail) : "Sign-up failed",
        code: "",
      });
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verification.code,
      });

      if (completeSignUp.status === "complete") {
        try {
          await fetchAPI("/(api)/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: fullName,
              email: emailAddress,
              clerkId: completeSignUp.createdUserId,
              role: role ?? "disposer",
              phone: phone.trim() || null,
            }),
          });
        } catch (apiErr) {
          console.error("Failed to save user to DB:", apiErr);
          setVerification((prev) => ({
            ...prev,
            state: "failed",
            error:
              "Account created but profile setup failed. Please try again or contact support.",
          }));
          return;
        }

        await setActive({ session: completeSignUp.createdSessionId });

        setVerification((prev) => ({
          ...prev,
          state: "success",
        }));

        router.replace("/"); // index.tsx handles role-based routing
      } else {
        setVerification((prev) => ({
          ...prev,
          state: "failed",
          error: "Verification incomplete. Try again.",
        }));
      }
    } catch (err: any) {
      setVerification((prev) => ({
        ...prev,
        error: err?.errors?.[0]?.longMessage || "Verification failed",
        state: "failed",
      }));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.imageWrapper}>
          <Image source={bin2} style={styles.image} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111" />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Create an Account</Text>

        <View style={styles.formContainer}>
          <CustomInput
            label="Full Name"
            placeholder="Enter your name"
            icon="person-outline"
            value={fullName}
            onChangeText={setFullName}
          />
          <CustomInput
            label="Email"
            placeholder="Enter your email"
            keyboardType="email-address"
            icon="mail-outline"
            value={emailAddress}
            onChangeText={setEmailAddress}
          />
          <CustomInput
            label="Phone Number"
            placeholder="e.g. 0812345678"
            keyboardType="phone-pad"
            icon="call-outline"
            value={phone}
            onChangeText={setPhone}
          />
          <CustomInput
            label="Password"
            placeholder="Enter your password"
            secureTextEntry
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
          />

          {verification.state === "error" && (
            <Text style={styles.errorText}>{verification.error}</Text>
          )}

          <CustomButton title="Sign Up" onPress={onSignUpPress} customStyle={styles.button} />

          <OAuth />

          <Link href="/sign-in" style={styles.link}>
            <Text style={styles.linkText}>Already Have an Account? </Text>
            <Text style={styles.logInText}>Log In</Text>
          </Link>

          <Text style={styles.termsNote}>
            By signing up you agree to our{" "}
            <Link href="/(root)/terms"><Text style={styles.termsLink}>Terms of Service</Text></Link>
            {" "}and{" "}
            <Link href="/(root)/privacy"><Text style={styles.termsLink}>Privacy Policy</Text></Link>
          </Text>

          {/* Verification Pending Modal */}
          <ReactNativeModal
            isVisible={verification.state === "pending"}
            onBackdropPress={() => {}}
          >
            <View style={styles.modalContent}>
              <Text style={styles.title}>Verification</Text>
              <Text style={{ marginBottom: 10 }}>
                We've sent a verification code to {emailAddress}
              </Text>

              <CustomInput
                label="Verification Code"
                placeholder="Enter code"
                icon="lock-closed-outline"
                value={verification.code}
                onChangeText={(text) =>
                  setVerification((prev) => ({ ...prev, code: text }))
                }
              />

              <CustomButton
                title="Verify Email"
                onPress={onPressVerify}
                customStyle={{ marginTop: 20 }}
              />
            </View>
          </ReactNativeModal>

          {/* Verification Success Modal */}
          <ReactNativeModal isVisible={verification.state === "success"}>
            <View style={styles.modalContent}>
              <Image source={check} style={styles.modalImage} />
              <Text style={styles.successText}>Sign-up Successful!</Text>
              <Text style={styles.subSuccessText}>
                You have successfully verified your account.
              </Text>
              <CustomButton
                title="Browse Home"
                onPress={() => router.replace("/")}
                customStyle={{ marginTop: 20 }}
              />
            </View>
          </ReactNativeModal>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    padding: 0,
    alignItems: "center",
  },
  imageWrapper: {
    width: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: 130,
    resizeMode: "contain",
  },
  backBtn: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },

  green: {
    color: "#1AB045",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
    color: "#111",
  },
  formContainer: {
    width: "90%",
    paddingVertical: 20,
  },
  link: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  linkText: {
    fontSize: 15,
    color: "#6B7280",
  },
  logInText: {
    fontSize: 15,
    color: "#1AB045",
    fontWeight: "600",
  },
  button: {
    marginTop: 20,
  },
  errorText: {
    color: "#EF4444",
    marginTop: 10,
    textAlign: "center",
    fontSize: 13,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    minHeight: 280,
    justifyContent: "center",
  },
  modalImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
    alignSelf: "center",
  },
  successText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1AB045",
    textAlign: "center",
  },
  subSuccessText: {
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
    fontSize: 14,
  },
  termsNote: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
  termsLink: {
    color: "#1AB045",
    fontWeight: "600",
  },
});

export default SignUp;
