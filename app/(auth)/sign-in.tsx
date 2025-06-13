import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import bin2 from "@/assets/images/bin2.png";
import CustomButton from "@/components/customButton";
import CustomInput from "@/components/CustomInput";
import OAuth from "@/components/oAuth";

const SignIn = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");

  const onSignInPress = async () => {
    if (!isLoaded) return;

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/");
      } else {
        console.error("Sign-in not complete:", JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err) {
      console.error("Sign-in error:", JSON.stringify(err, null, 2));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.imageWrapper}>
            <Image source={bin2} style={styles.image} />
          </View>

          {/* Stylized Logo Text */}
          <Text style={styles.title}>
            Ec<Text style={styles.green}>ho</Text> F<Text style={styles.green}>etch</Text>
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

            <CustomButton
              title="Sign In"
              onPress={onSignInPress}
              style={styles.button}
            />

            <OAuth />

            <Link href="/sign-up" style={styles.link}>
              <Text style={styles.linkText}>Don't have an account? </Text>
              <Text style={styles.logInText}>Sign up</Text>
            </Link>
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
  },
  image: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#000",
    textAlign: "center",
  },
  green: {
    color: "#4CAF50", // Stylish green
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
});

export default SignIn;
