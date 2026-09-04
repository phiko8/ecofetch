import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import bin2 from "@/assets/images/bin2.png";
import CustomButton from "@/components/customButton";
import CustomInput from "@/components/CustomInput";
import { fetchAPI } from "@/lib/fetch";

const BLUE = "#F97316";

export default function DriverComplete() {
  const { user } = useUser();

  const [checking, setChecking] = useState(true);
  const [idNumber, setIdNumber] = useState("");
  const [carType, setCarType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If this driver already has an id_number saved, skip straight to dashboard
  useEffect(() => {
    if (!user?.id) return;
    fetchAPI(`/(api)/user?clerkId=${user.id}`)
      .then((res) => {
        if (res?.data?.id_number) {
          router.replace("/(root)/(driver-tabs)/dashboard");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [user?.id]);

  const onComplete = async () => {
    if (!idNumber.trim() || !carType.trim()) {
      setError("Please fill in both fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await fetchAPI("/(api)/driver-register", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user?.id,
          idNumber: idNumber.trim(),
          vehicleType: carType.trim(),
          name: user?.fullName ?? user?.firstName ?? "Driver",
        }),
      });
      router.replace("/(root)/(driver-tabs)/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={BLUE} />
      </SafeAreaView>
    );
  }

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
          {/* Banner */}
          <View style={styles.banner}>
            <Image source={bin2} style={styles.bannerImage} />
          </View>

          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            One last step — add your ID number and vehicle type to activate your
            collector account.
          </Text>

          <CustomInput
            label="ID Number *"
            placeholder="e.g. 9001015009087"
            icon="card-outline"
            value={idNumber}
            onChangeText={setIdNumber}
          />
          <CustomInput
            label="Vehicle Type *"
            placeholder="e.g. Bakkie, Truck, Van"
            icon="car-sport-outline"
            value={carType}
            onChangeText={setCarType}
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <CustomButton
            title={loading ? "Saving..." : "Complete Registration"}
            onPress={onComplete}
            customStyle={[styles.btn, { backgroundColor: BLUE }]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 0 },
  banner: {
    width: "100%",
    height: 130,
    marginHorizontal: -24,
    alignSelf: "stretch",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  iconArea: { alignItems: "center", marginBottom: 24 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    color: "#111",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
  btn: { marginTop: 20 },
});
