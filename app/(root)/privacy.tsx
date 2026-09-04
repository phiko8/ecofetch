import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    body: "We collect information you provide when registering (name, email, phone, SA ID number for collectors) and information generated when using the app (location data, booking history, device information).",
  },
  {
    title: "2. How We Use Your Information",
    body: "We use your information to provide and improve the service, match disposers with collectors, process payments, send job notifications, and comply with legal obligations.",
  },
  {
    title: "3. Location Data",
    body: "Collectors share their location while on a job to enable real-time tracking. Disposers' pickup addresses are shared with their assigned collector. Location data is not stored beyond the duration of the job.",
  },
  {
    title: "4. Sharing Your Information",
    body: "We do not sell your personal information. We share limited information with your matched collector/disposer to facilitate the booking. We may share data with service providers (payment processing, cloud hosting) under strict confidentiality agreements.",
  },
  {
    title: "5. Data Security",
    body: "We use industry-standard encryption and security practices. Authentication is handled by Clerk, a certified identity provider. Passwords are never stored in plain text. However, no method of transmission over the internet is 100% secure.",
  },
  {
    title: "6. Data Retention",
    body: "We retain your account data as long as your account is active. Booking history is retained for 3 years for legal and accounting purposes. You may request deletion of your account and associated data at any time.",
  },
  {
    title: "7. Your Rights (POPIA)",
    body: "Under the Protection of Personal Information Act (POPIA), you have the right to access, correct, or delete your personal information. To exercise these rights, contact us at privacy@ecofetch.co.za.",
  },
  {
    title: "8. Children's Privacy",
    body: "Eco Fetch is not intended for users under 18 years of age. We do not knowingly collect personal information from minors.",
  },
  {
    title: "9. Cookies & Analytics",
    body: "Our mobile app does not use cookies. We may use anonymised analytics to understand usage patterns and improve the app. No personally identifiable information is included in analytics data.",
  },
  {
    title: "10. Contact Us",
    body: "For privacy-related enquiries, contact our Information Officer at:\nprivacy@ecofetch.co.za\n\nEco Fetch (Pty) Ltd\nSouth Africa",
  },
];

export default function Privacy() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: April 2026</Text>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  lastUpdated: { fontSize: 12, color: "#9CA3AF", marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 6 },
  sectionBody: { fontSize: 14, color: "#374151", lineHeight: 22 },
});
