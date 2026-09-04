import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By creating an account or using Eco Fetch, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app.",
  },
  {
    title: "2. Description of Service",
    body: "Eco Fetch is a waste collection booking platform that connects waste disposers with independent collectors (drivers). We facilitate bookings but are not responsible for the actual collection service.",
  },
  {
    title: "3. User Accounts",
    body: "You must provide accurate information when registering. You are responsible for all activity under your account. Notify us immediately of any unauthorised use. We reserve the right to suspend accounts that violate these terms.",
  },
  {
    title: "4. Collector Responsibilities",
    body: "Collectors must hold valid licences and comply with all applicable South African waste management regulations. Eco Fetch does not employ collectors — they are independent service providers.",
  },
  {
    title: "5. Payments & Fees",
    body: "Prices are calculated based on waste type, volume, and distance. All fees are displayed before booking confirmation. Payments processed through the app are handled securely. Cash payments are the responsibility of the parties involved.",
  },
  {
    title: "6. Cancellations",
    body: "Disposers may cancel a booking before the collector accepts the job. Once accepted, cancellations may be subject to a fee. Collectors who repeatedly cancel accepted jobs may be suspended.",
  },
  {
    title: "7. Prohibited Use",
    body: "You may not use Eco Fetch to dispose of hazardous, illegal, or regulated materials without proper authorisation. Misuse of the platform may result in immediate account termination.",
  },
  {
    title: "8. Liability",
    body: "Eco Fetch is provided 'as is'. We do not guarantee uninterrupted service. Our liability is limited to the amount paid for the booking in question. We are not liable for indirect or consequential damages.",
  },
  {
    title: "9. Changes to Terms",
    body: "We may update these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms. We will notify users of material changes via email or in-app notification.",
  },
  {
    title: "10. Governing Law",
    body: "These terms are governed by the laws of the Republic of South Africa. Any disputes shall be resolved in the courts of South Africa.",
  },
];

export default function Terms() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
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
