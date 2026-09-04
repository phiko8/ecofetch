import { fetchAPI } from "@/lib/fetch";
import { DRIVER_DARK, DRIVER_LIGHT, useThemeStore } from "@/store";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BLUE = "#F97316";
const GREEN = "#1AB045";

type Period = "week" | "month" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

interface CompletedJob {
  ride_id: number;
  fare_price: number;
  origin_address: string;
  created_at: string;
  rating: number | null;
}

const SummaryCard = ({
  icon,
  label,
  value,
  bg,
  t,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  bg: string;
  t: typeof DRIVER_LIGHT;
}) => (
  <View style={[styles.summaryCard, { backgroundColor: t.summaryCardBg }]}>
    <View style={[styles.summaryIcon, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={BLUE} />
    </View>
    <Text style={[styles.summaryValue, { color: BLUE }]}>{value}</Text>
    <Text style={[styles.summaryLabel, { color: t.subText }]}>{label}</Text>
  </View>
);

const Earnings = () => {
  const { user } = useUser();
  const [period, setPeriod] = useState<Period>("week");
  const isDark = useThemeStore((s) => s.isDark);
  const t = isDark ? DRIVER_DARK : DRIVER_LIGHT;

  const [allJobs, setAllJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Fetch all completed jobs once — filter by period client-side
  const fetchCompleted = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetchAPI(
        `/(api)/jobs?filter=completed&driverClerkId=${user.id}&limit=200`
      );
      setAllJobs((res?.data as CompletedJob[]) ?? []);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCompleted();
  }, [fetchCompleted]);

  const { jobs, totalEarned, jobsCount, avgRating } = useMemo(() => {
    const msInDay = 86_400_000;
    const now = Date.now();
    const cutoff =
      period === "week"   ? now - 7  * msInDay :
      period === "month"  ? now - 30 * msInDay : 0;

    const filtered = cutoff
      ? allJobs.filter((j) => new Date(j.created_at).getTime() >= cutoff)
      : allJobs;

    const totalEarned = filtered.reduce((sum, j) => sum + Number(j.fare_price ?? 0), 0);
    const ratedJobs   = filtered.filter((j) => j.rating != null);
    const avgRating   = ratedJobs.length > 0
      ? ratedJobs.reduce((sum, j) => sum + (j.rating ?? 0), 0) / ratedJobs.length
      : null;

    return { jobs: filtered, totalEarned, jobsCount: filtered.length, avgRating };
  }, [allJobs, period]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.ride_id.toString()}
        renderItem={({ item }) => {
          const date = new Date(item.created_at).toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          return (
            <View style={[styles.historyRow, { backgroundColor: t.card }]}>
              <View style={styles.historyLeft}>
                <Ionicons name="checkmark-circle" size={18} color={GREEN} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.historyAddress, { color: t.text }]}
                    numberOfLines={1}
                  >
                    {item.origin_address}
                  </Text>
                  <Text style={[styles.historyDate, { color: t.subText }]}>
                    {date}
                  </Text>
                </View>
              </View>
              <Text style={styles.historyFare}>
                R{Number(item.fare_price).toFixed(0)}
              </Text>
            </View>
          );
        }}
        style={styles.list}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={[styles.header, { color: BLUE }]}>Earnings</Text>

            {/* Total earnings banner */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Earned</Text>
              {loading ? (
                <ActivityIndicator color="#fff" style={{ marginVertical: 8 }} />
              ) : (
                <>
                  <Text style={styles.totalAmount}>R {totalEarned.toFixed(2)}</Text>
                  <Text style={styles.totalSub}>
                    {jobsCount} job{jobsCount !== 1 ? "s" : ""} completed
                  </Text>
                </>
              )}
            </View>

            {/* Period selector */}
            <View style={styles.periodRow}>
              {PERIODS.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    styles.periodBtn,
                    { borderColor: t.border, backgroundColor: t.chipBg },
                    period === p.key && styles.periodBtnActive,
                  ]}
                  onPress={() => setPeriod(p.key)}
                >
                  <Text
                    style={[
                      styles.periodBtnText,
                      { color: t.subText },
                      period === p.key && styles.periodBtnTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Summary stats */}
            <View style={styles.summaryRow}>
              <SummaryCard
                icon="briefcase-outline"
                label="Jobs Done"
                value={loading ? "…" : String(jobsCount)}
                bg={isDark ? "#1A3A5C" : "#E8F0F9"}
                t={t}
              />
              <SummaryCard
                icon="wallet-outline"
                label="Earned"
                value={loading ? "…" : `R${totalEarned.toFixed(0)}`}
                bg={isDark ? "#0E3320" : "#D1FAE5"}
                t={t}
              />
              <SummaryCard
                icon="star-outline"
                label="Avg Rating"
                value={loading ? "…" : avgRating != null ? `${avgRating.toFixed(1)} ★` : "—"}
                bg={isDark ? "#3A2E0E" : "#FEF3C7"}
                t={t}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: t.text }]}>
              Payment History
            </Text>
          </>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={52} color={t.muted} />
              <Text style={[styles.emptyTitle, { color: t.text }]}>
                {fetchError ? "Failed to load earnings" : "No earnings yet"}
              </Text>
              <Text style={[styles.emptySub, { color: t.subText }]}>
                {fetchError
                  ? "Check your connection and try again"
                  : "Complete collection jobs to start earning"}
              </Text>
              {fetchError && (
                <TouchableOpacity onPress={fetchCompleted} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

export default Earnings;

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 20 },
  content: { paddingBottom: 110 },
  header: {
    fontSize: 24,
    marginTop: 20,
    marginBottom: 16,
  },
  totalCard: {
    backgroundColor: BLUE,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    minHeight: 110,
    justifyContent: "center",
  },
  totalLabel: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 6 },
  totalAmount: {
    fontSize: 40,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1,
    marginBottom: 4,
  },
  totalSub: { fontSize: 13, color: "rgba(255,255,255,0.6)" },
  periodRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  periodBtnActive: { backgroundColor: BLUE, borderColor: BLUE },
  periodBtnText: { fontSize: 12, fontWeight: "600" },
  periodBtnTextActive: { color: "#fff" },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  summaryValue: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  summaryLabel: { fontSize: 11, textAlign: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  historyLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  historyAddress: { fontSize: 13, fontWeight: "600" },
  historyDate: { fontSize: 12, marginTop: 2 },
  historyFare: { fontSize: 16, fontWeight: "800", color: GREEN },
  empty: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center" },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: BLUE,
    borderRadius: 20,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
