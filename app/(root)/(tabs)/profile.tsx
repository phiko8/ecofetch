import { useUser } from "@clerk/clerk-expo";
import { useSignOut } from "@/lib/useSignOut";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { icons } from "@/constants";
const FALLBACK_AVATAR = icons.person;
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import InputField from "@/components/input-field";
import { useFetch } from "@/lib/fetch";

const GREEN = "#1AB045";

const Profile = () => {
  const { user } = useUser();
  const { performSignOut, loading: signingOut } = useSignOut();

  const { data: dbUser } = useFetch<{ name: string; email: string; role: string; phone: string }>(
    user?.id ? `/(api)/user?clerkId=${user.id}` : null,
  );

  const dbNameParts = dbUser?.name?.trim().split(" ") ?? [];
  const dbFirstName = dbNameParts[0] ?? "";
  const dbLastName = dbNameParts.slice(1).join(" ") ?? "";

  const firstName = user?.firstName || dbFirstName;
  const lastName = user?.lastName || dbLastName;
  const email = user?.primaryEmailAddress?.emailAddress || dbUser?.email;

  const isAdmin = dbUser?.role === "admin";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>My Profile</Text>

        <View style={styles.avatarContainer}>
          <Image
            source={
              user?.externalAccounts?.[0]?.imageUrl ?? user?.imageUrl
                ? { uri: user?.externalAccounts?.[0]?.imageUrl ?? user?.imageUrl }
                : FALLBACK_AVATAR
            }
            defaultSource={FALLBACK_AVATAR}
            style={styles.avatar}
          />
        </View>

        {/* Admin button — only visible to admin users */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => router.push("/(root)/admin")}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
            <Text style={styles.adminBtnText}>Admin Panel</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}

        <View style={styles.infoCard}>
          <InputField
            label="First name"
            placeholder={firstName || "Not Found"}
            editable={false}
          />

          <InputField
            label="Last name"
            placeholder={lastName || "Not Found"}
            editable={false}
          />

          <InputField
            label="Email"
            placeholder={email || "Not Found"}
            editable={false}
          />

          <InputField
            label="Phone"
            placeholder={dbUser?.phone || user?.primaryPhoneNumber?.phoneNumber || "Not Found"}
            editable={false}
          />
        </View>

        {/* Legal links */}
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => router.push("/(root)/terms")} style={styles.legalBtn}>
            <Ionicons name="document-text-outline" size={16} color="#6B7280" />
            <Text style={styles.legalText}>Terms of Service</Text>
          </TouchableOpacity>
          <View style={styles.legalDivider} />
          <TouchableOpacity onPress={() => router.push("/(root)/privacy")} style={styles.legalBtn}>
            <Ionicons name="shield-outline" size={16} color="#6B7280" />
            <Text style={styles.legalText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={performSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
        >
          <Ionicons name={signingOut ? "hourglass-outline" : "log-out-outline"} size={18} color="#EF4444" />
          <Text style={styles.signOutText}>{signingOut ? "Signing out…" : "Sign Out"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    fontSize: 24,
    marginVertical: 20,
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#ccc",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: "#ccc",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1AB045",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 20,
    gap: 10,
  },
  adminBtnText: {
    flex: 1,
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  legalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  legalText: {
    fontSize: 13,
    color: "#6B7280",
  },
  legalDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#D1D5DB",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: "#FFF5F5",
  },
  signOutText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 15,
  },
});

export default Profile;
