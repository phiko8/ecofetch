import { Link, router } from "expo-router";
import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import ReactNativeModal from "react-native-modal";
import { SafeAreaView } from "react-native-safe-area-context";

import bin2 from "@/assets/images/bin2.png";
import check from "@/assets/images/check.png";
import CustomButton from "@/components/customButton";
import CustomInput from "@/components/CustomInput";
import OAuth from "@/components/oAuth";

import { fetchAPI } from "@/lib/fetch";
import { setActive, useSignUp } from "@clerk/clerk-expo";

const SignUp = () => {
  const { signUp, isLoaded } = useSignUp();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);

  const [verification, setVerification] = useState({
    state: "default", // 'default', 'pending', 'error', 'success', 'failed'
    error: "",
    code: "",
  });

  const onSignUpPress = async () => {
    if (!isLoaded) return;

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

      setPendingVerification(true);
    } catch (err: any) {
      console.error("Sign-up error: ", err);
      setVerification({
        state: "error",
        error: err?.errors?.[0]?.message || "Sign-up failed",
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
        await fetchAPI("/(api)/user", {
        method: "POST",
        headers: {
       "Content-Type": "application/json",
      },
       body: JSON.stringify({
       name: fullName,
       email: emailAddress,
       clerkId: completeSignUp.createdUserId,
       }),
    });

        await setActive({ session: completeSignUp.createdSessionId });

        setVerification((prev) => ({
          ...prev,
          state: "success",
        }));

        router.replace("/home"); // You can update this route
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
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.imageWrapper}>
          <Image source={bin2} style={styles.image} />
        </View>
        <Text style={styles.title}>
                    Ec<Text style={styles.green}>ho</Text> F<Text style={styles.green}>etch</Text>
                  </Text>

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

          <CustomButton title="Sign Up" onPress={onSignUpPress} style={styles.button} />

          {pendingVerification && (
            <>
              <CustomInput
                label="Verification Code"
                placeholder="Enter code"
                icon="lock-closed-outline"
                value={verification.code}
                onChangeText={(text) =>
                  setVerification((prev) => ({ ...prev, code: text }))
                }
              />
              <CustomButton title="Verify Email" onPress={onPressVerify} style={styles.button} />
            </>
          )}

          <OAuth />

          <Link href="/sign-in" style={styles.link}>
            <Text style={styles.linkText}>Already Have an Account? </Text>
            <Text style={styles.logInText}>Log In</Text>
          </Link>

          {/* Verification Pending Modal */}
          <ReactNativeModal
            isVisible={verification.state === "pending"}
            onModalHide={() =>
              setVerification((prev) => ({ ...prev, state: "success" }))
            }
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
                style={{ marginTop: 20 }}
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
                onPress={() => router.replace("/(root)/(tabs)/home")}
                style={{ marginTop: 20 }}
              />
            </View>
          </ReactNativeModal>
        </View>
      </ScrollView>
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
  },
  image: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },

  green: {
    color: "#4CAF50", // Stylish green
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
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
    fontSize: 16,
    color: "#333",
  },
  logInText: {
    fontSize: 16,
    color: "#007bff",
  },
  button: {
    marginTop: 20,
  },
  errorText: {
    color: "red",
    marginTop: 10,
    textAlign: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 300,
    justifyContent: "center",
  },
  modalImage: {
    width: 110,
    height: 110,
    marginBottom: 20,
    alignSelf: "center",
  },
  successText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "green",
    textAlign: "center",
  },
  subSuccessText: {
    color: "gray",
    textAlign: "center",
    marginTop: 2,
    fontSize: 14,
  },
});

export default SignUp;
