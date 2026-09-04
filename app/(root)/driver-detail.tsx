import { useUser } from "@clerk/clerk-expo";
import { fetchAPI } from "@/lib/fetch";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BLUE = "#F97316";
const GREEN = "#1AB045";

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  pending:  { bg: "#FEF3C7", text: "#D97706", icon: "time-outline" },
  approved: { bg: "#D1FAE5", text: "#065F46", icon: "checkmark-circle" },
  rejected: { bg: "#FEE2E2", text: "#B91C1C", icon: "close-circle" },
  banned:   { bg: "#F3F4F6", text: "#374151", icon: "ban-outline" },
};

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={18} color={BLUE} />
    </View>
    <View style={styles.infoText}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, !value && styles.infoValueEmpty]}>
        {value || "Not provided"}
      </Text>
    </View>
  </View>
);

const DriverDetail = () => {
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    email: string;
    id_number: string;
    phone: string;
    vehicle_type: string;
    license_number: string;
    number_plate: string;
    status: string;
    role: string;
  }>();

  const { user } = useUser();
  const [status, setStatus] = useState(params.status ?? "pending");
  const [loading, setLoading] = useState(false);

  const statusStyle = STATUS_COLORS[status] ?? STATUS_COLORS.pending;
  const initials = (params.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleUpdateStatus = async (newStatus: "approved" | "rejected" | "banned" | "pending") => {
    const label = newStatus === "approved" ? "Approve" : "Reject";
    Alert.alert("Confirm", `${label} this driver?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: label,
        style: newStatus === "rejected" ? "destructive" : "default",
        onPress: async () => {
          setLoading(true);
          try {
            await fetchAPI("/(api)/admin/users", {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "X-Clerk-User-Id": user?.id ?? "",
              },
              body: JSON.stringify({ id: Number(params.id), status: newStatus }),
            });
            setStatus(newStatus);
          } catch {
            Alert.alert("Error", "Failed to update status. Please try again.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{params.name}</Text>
          <Text style={styles.email}>{params.email}</Text>

          {/* Status pill */}
          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
            <Ionicons name={statusStyle.icon} size={14} color={statusStyle.text} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Registration details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registration Details</Text>

          <InfoRow icon="person-outline"          label="Full Name"        value={params.name} />
          <InfoRow icon="mail-outline"             label="Email Address"    value={params.email} />
          <InfoRow icon="card-outline"             label="SA ID Number"     value={params.id_number} />
          <InfoRow icon="call-outline"             label="Phone Number"     value={params.phone} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>

          <InfoRow icon="car-outline"              label="Vehicle Type"     value={params.vehicle_type} />
          <InfoRow icon="document-text-outline"    label="License Number"   value={params.license_number} />
          <InfoRow icon="keypad-outline"           label="Number Plate"     value={params.number_plate} />
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {status === "pending" && (
            <>
              <TouchableOpacity
                style={[styles.btn, styles.rejectBtn, loading && styles.btnDisabled]}
                onPress={() => handleUpdateStatus("rejected")}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.approveBtn, loading && styles.btnDisabled]}
                onPress={() => handleUpdateStatus("approved")}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>Approve</Text>
              </TouchableOpacity>
            </>
          )}

          {status === "approved" && (
            <>
              <TouchableOpacity
                style={[styles.btn, styles.revokeBtn, loading && styles.btnDisabled]}
                onPress={() => handleUpdateStatus("rejected")}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>Revoke</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.banBtn, loading && styles.btnDisabled]}
                onPress={() => handleUpdateStatus("banned")}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="ban-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>Ban Driver</Text>
              </TouchableOpacity>
            </>
          )}

          {status === "rejected" && (
            <>
              <TouchableOpacity
                style={[styles.btn, styles.approveBtn, loading && styles.btnDisabled]}
                onPress={() => handleUpdateStatus("approved")}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.banBtn, loading && styles.btnDisabled]}
                onPress={() => handleUpdateStatus("banned")}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="ban-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>Ban Driver</Text>
              </TouchableOpacity>
            </>
          )}

          {status === "banned" && (
            <TouchableOpacity
              style={[styles.btn, styles.approveBtn, loading && styles.btnDisabled]}
              onPress={() => handleUpdateStatus("approved")}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.btnText}>Unban Driver</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DriverDetail;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  scroll: { paddingBottom: 40 },

  avatarSection: { alignItems: "center", paddingVertical: 32, backgroundColor: "#fff", marginBottom: 12 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: BLUE, alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  name: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 4 },
  email: { fontSize: 14, color: "#6B7280", marginBottom: 14 },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
  },
  statusText: { fontSize: 13, fontWeight: "700" },

  section: {
    backgroundColor: "#fff", marginHorizontal: 16,
    borderRadius: 16, padding: 16, marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: "700", color: "#9CA3AF",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  infoIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center",
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "600", marginBottom: 3 },
  infoValue: { fontSize: 15, color: "#111", fontWeight: "600" },
  infoValueEmpty: { color: "#9CA3AF", fontStyle: "italic", fontWeight: "400" },

  actions: {
    flexDirection: "row", gap: 12,
    marginHorizontal: 16, marginTop: 8,
  },
  btn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    paddingVertical: 15, borderRadius: 14,
  },
  approveBtn: { backgroundColor: GREEN },
  rejectBtn:  { backgroundColor: "#EF4444" },
  revokeBtn:  { backgroundColor: "#6B7280" },
  banBtn:     { backgroundColor: "#111827" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
