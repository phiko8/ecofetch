import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchAPI, useFetch } from "@/lib/fetch"; // fetchAPI used in handleUpdateStatus
import { UserRegistration } from "@/types/type";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:  { bg: "#FEF3C7", text: "#D97706" },
  approved: { bg: "#D1FAE5", text: "#065F46" },
  rejected: { bg: "#FEE2E2", text: "#B91C1C" },
  banned:   { bg: "#F3F4F6", text: "#374151" },
};

const TABS = ["All", "Pending", "Approved", "Rejected", "Banned"];

const UserCard = ({
  user,
  onPress,
}: {
  user: UserRegistration;
  onPress: () => void;
}) => {
  const colors = STATUS_COLORS[user.status] ?? STATUS_COLORS.pending;
  const initials = (user.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
          <Text style={styles.userRole}>
            {user.role === "driver" ? "🚛 Collector" : "♻️ Disposer"}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statusText, { color: colors.text }]}>
              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Detail row helper ─────────────────────────────────────────────

const StatCard = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <View style={[styles.statCard, { borderTopColor: color }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const Admin = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("All");

  const { data: dbUser, loading: roleLoading } = useFetch<{ role: string }>(
    user?.id ? `/(api)/user?clerkId=${user.id}` : null,
  );

  const isAdmin = dbUser?.role === "admin";

  const {
    data: users,
    loading,
    refetch,
  } = useFetch<UserRegistration[]>(
    user?.id ? "/(api)/admin/users" : null,
    { headers: { "X-Clerk-User-Id": user?.id ?? "" } },
  );

  useFocusEffect(
    useCallback(() => {
      if (user?.id) refetch();
    }, [user?.id]),
  );

  // Show spinner while role is being fetched
  if (roleLoading || !dbUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDenied}>
          <ActivityIndicator size="large" color="#1AB045" />
        </View>
      </SafeAreaView>
    );
  }

  // Block non-admin access
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed-outline" size={56} color="#EF4444" />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            You do not have permission to view this page.
          </Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
            <Text style={styles.goBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const total    = users?.length ?? 0;
  const pending  = users?.filter((u) => u.status === "pending").length  ?? 0;
  const approved = users?.filter((u) => u.status === "approved").length ?? 0;
  const rejected = users?.filter((u) => u.status === "rejected").length ?? 0;
  const banned   = users?.filter((u) => u.status === "banned").length   ?? 0;

  const filtered =
    users?.filter(
      (u) => activeTab === "All" || u.status === activeTab.toLowerCase(),
    ) ?? [];

  const handleUpdateStatus = async (
    id: number,
    status: "approved" | "rejected",
  ) => {
    const label = status === "approved" ? "approve" : "reject";
    Alert.alert(
      "Confirm",
      `Are you sure you want to ${label} this user?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: label.charAt(0).toUpperCase() + label.slice(1),
          style: status === "rejected" ? "destructive" : "default",
          onPress: async () => {
            try {
              await fetchAPI("/(api)/admin/users", {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  "X-Clerk-User-Id": user?.id ?? "",
                },
                body: JSON.stringify({ id, status }),
              });
              refetch();
            } catch (err) {
              Alert.alert("Error", "Failed to update user status.");
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <UserCard
            user={item}
            onPress={() =>
              router.push({
                pathname: "/(root)/driver-detail",
                params: {
                  id:             String(item.id),
                  name:           item.name,
                  email:          item.email,
                  id_number:      item.id_number,
                  phone:          item.phone,
                  vehicle_type:   item.vehicle_type,
                  license_number: item.license_number,
                  number_plate:   item.number_plate,
                  status:         item.status,
                  role:           item.role,
                },
              })
            }
          />
        )}
        style={styles.list}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={22} color="#111" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Admin Panel</Text>
              <View style={{ width: 36 }} />
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <StatCard label="Total"    value={total}    color="#6B7280" />
              <StatCard label="Pending"  value={pending}  color="#D97706" />
              <StatCard label="Approved" value={approved} color="#1AB045" />
              <StatCard label="Rejected" value={rejected} color="#EF4444" />
              <StatCard label="Banned"   value={banned}   color="#374151" />
            </View>

            {/* Tabs */}
            <View style={styles.tabsRow}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab && styles.tabTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#1AB045" />
            ) : (
              <Text style={styles.emptyText}>No driver registrations found</Text>
            )}
          </View>
        )}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  list: {
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingBottom: 40,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    color: "#111",
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "500",
  },

  /* Tabs */
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#111",
  },

  /* User Card */
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1AB045",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  userRole: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* Actions */
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    gap: 5,
  },
  approveBtn: {
    backgroundColor: "#1AB045",
  },
  rejectBtn: {
    backgroundColor: "#EF4444",
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  resetBtn: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
  },
  resetBtnText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },

  /* Empty */
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: "#9CA3AF",
  },

  /* Access denied */
  accessDenied: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  accessDeniedTitle: {
    fontSize: 22,
    color: "#111",
  },
  accessDeniedText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  goBackBtn: {
    marginTop: 8,
    backgroundColor: "#1AB045",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  goBackBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});

export default Admin;
