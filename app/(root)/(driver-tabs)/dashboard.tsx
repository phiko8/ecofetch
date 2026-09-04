import { fetchAPI } from "@/lib/fetch";
import { registerDriverPushToken } from "@/lib/notifications";
import { DRIVER_DARK, DRIVER_LIGHT, useThemeStore } from "@/store";
import { useUser } from "@clerk/clerk-expo";
import { useSignOut } from "@/lib/useSignOut";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BLUE = "#F97316";
const GREEN = "#1AB045";
const POLL_MS = 5000;

interface IncomingJob {
  ride_id: number;
  origin_address: string;
  destination_address: string;
  origin_latitude: number | null;
  origin_longitude: number | null;
  fare_price: number;
  created_at: string;
  user_name: string;
}

interface ActiveJob {
  ride_id: number;
  origin_address: string;
  origin_latitude: number | null;
  origin_longitude: number | null;
  fare_price: number;
  user_name: string | null;
}

// ── Request card ─────────────────────────────────────────────────
const RequestCard = ({
  job,
  onAccept,
  onReject,
  accepting,
}: {
  job: IncomingJob;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  accepting: number | null;
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const t = isDark ? DRIVER_DARK : DRIVER_LIGHT;
  const isAccepting = accepting === job.ride_id;
  const diff = Math.round(
    (Date.now() - new Date(job.created_at).getTime()) / 60000
  );
  const timeAgo =
    diff < 1 ? "just now" : diff === 1 ? "1 min ago" : `${diff} mins ago`;

  return (
    <View style={[styles.requestCard, { backgroundColor: t.card }]}>
      <View style={styles.requestTop}>
        <View style={[styles.userPill, { backgroundColor: t.pillBg }]}>
          <Ionicons name="person-circle-outline" size={20} color={BLUE} />
          <Text style={[styles.userName, { color: BLUE }]}>
            {job.user_name || "User"}
          </Text>
        </View>
        <Text style={[styles.timeAgo, { color: t.muted }]}>{timeAgo}</Text>
      </View>

      <View style={styles.routeBlock}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: GREEN }]} />
          <Text style={[styles.routeText, { color: t.text }]} numberOfLines={2}>
            {job.origin_address}
          </Text>
        </View>
        <View style={[styles.routeLine, { backgroundColor: t.border }]} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: "#EF4444" }]} />
          <Text style={[styles.routeText, { color: t.text }]} numberOfLines={2}>
            {job.destination_address || "No facility specified"}
          </Text>
        </View>
      </View>

      <View style={[styles.fareRow, { backgroundColor: t.fareRowBg }]}>
        <Ionicons name="wallet-outline" size={16} color={t.subText} />
        <Text style={[styles.fareLabel, { color: t.subText }]}>Fare</Text>
        <Text style={styles.fareAmount}>
          R {Number(job.fare_price).toFixed(2)}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.rejectBtn,
            {
              borderColor: "#FCA5A5",
              backgroundColor: isDark ? "#2A1414" : "#FFF5F5",
            },
          ]}
          onPress={() => onReject(job.ride_id)}
          disabled={isAccepting}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={18} color="#EF4444" />
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptBtn, isAccepting && styles.acceptBtnLoading]}
          onPress={() => onAccept(job.ride_id)}
          disabled={isAccepting}
          activeOpacity={0.8}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.acceptBtnText}>Accept</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useUser();
  const { performSignOut, loading: signingOut } = useSignOut();
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const t = isDark ? DRIVER_DARK : DRIVER_LIGHT;

  const [isOnline, setIsOnline] = useState(false);
  const [jobs, setJobs] = useState<IncomingJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [acceptError, setAcceptError] = useState("");
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const rejectedIds = useRef<Set<number>>(new Set());
  const seenJobIds = useRef<Set<number>>(new Set());
  const hasInitialLoad = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const ringToken = useRef(0);
  const isMounted = useRef(false);
  const fetchJobsRef = useRef<(() => void) | null>(null);

  // Register for push notifications once user is loaded
  useEffect(() => {
    if (user?.id) registerDriverPushToken(user.id);
  }, [user?.id]);

  // Check for an in-progress (accepted) job on mount so driver can resume after minimizing
  useEffect(() => {
    if (!user?.id) return;
    fetchAPI(`/(api)/jobs?filter=accepted&driverClerkId=${user.id}&limit=1`)
      .then((res) => {
        if (res?.data?.length > 0) setActiveJob(res.data[0]);
        else setActiveJob(null);
      })
      .catch(() => {});
  }, [user?.id]);

  // When driver taps a push notification, trigger an immediate job fetch
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      fetchJobsRef.current?.();
    });
    return () => sub.remove();
  }, []);

  // Sync online/offline status to DB; when going ONLINE also save current GPS
  // so the 30 km proximity filter works correctly on the user side.
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    if (!user?.id) return;

    const syncStatus = async () => {
      // Always update availability first
      await fetchAPI("/(api)/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: user.id, isAvailable: isOnline }),
      }).catch(() => {});

      // When going online, capture and save current GPS location
      if (isOnline) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") return;
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          await fetchAPI("/(api)/driver-location", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              driverClerkId: user.id,
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            }),
          }).catch(() => {});
        } catch {
          // Location unavailable — driver will still appear but may not be in 30 km filter
        }
      }
    };

    syncStatus();
  }, [isOnline, user?.id]);

  const stopAlert = async () => {
    ringToken.current++; // invalidate any in-flight ringAndBuzz — never resets
    Vibration.cancel();
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  };

  const ringAndBuzz = async () => {
    if (soundRef.current) return;
    const token = ++ringToken.current;

    // Vibrate in repeating ring pattern
    Vibration.vibrate([0, 500, 150, 500, 150, 500], true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Play ringtone on loop
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      if (token !== ringToken.current) return; // stopAlert was called
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/sounds/ringtone.mp3"),
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      if (token !== ringToken.current) {
        // stopAlert fired while sound was loading — discard immediately
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
        return;
      }
      soundRef.current = sound;
    } catch {
      // audio unavailable — vibration still active
    }
  };

  const displayName =
    user?.firstName ||
    user?.emailAddresses[0]?.emailAddress.split("@")[0] ||
    "Driver";

  // ── Job list polling ─────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    if (!isOnline || !user?.id) return;
    try {
      const res = await fetchAPI(
        `/(api)/jobs?filter=pending&driverClerkId=${user.id}`
      );
      if (res?.data) {
        const incoming = res.data as IncomingJob[];

        // Detect genuinely new job IDs (not yet seen and not rejected)
        const hasNew = incoming.some(
          (j) =>
            !seenJobIds.current.has(j.ride_id) &&
            !rejectedIds.current.has(j.ride_id)
        );

        // Ring only after first poll has completed (skip the initial snapshot)
        if (hasNew && hasInitialLoad.current) {
          ringAndBuzz();
        }

        // Mark all current jobs as seen, then flag initial load done
        incoming.forEach((j) => seenJobIds.current.add(j.ride_id));
        hasInitialLoad.current = true;

        setJobs(incoming.filter((j) => !rejectedIds.current.has(j.ride_id)));
      }
    } catch {
      // silently fail
    }
  }, [isOnline, user?.id]);

  // Keep ref in sync so the notification listener always calls the latest version
  fetchJobsRef.current = fetchJobs;

  useEffect(() => {
    if (!isOnline) {
      setJobs([]);
      seenJobIds.current.clear();
      hasInitialLoad.current = false;
      stopAlert();
      return;
    }
    setLoadingJobs(true);
    fetchJobs().finally(() => setLoadingJobs(false));
    const interval = setInterval(fetchJobs, POLL_MS);
    return () => {
      clearInterval(interval);
      stopAlert();
    };
  }, [isOnline, fetchJobs]);

  // ── Accept ───────────────────────────────────────────────────
  const handleAccept = async (rideId: number) => {
    if (!user?.id) return;
    await stopAlert();
    setAccepting(rideId);
    setAcceptError("");
    try {
      await fetchAPI("/(api)/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId, driverClerkId: user.id, action: "accept" }),
      });

      const job = jobs.find((j) => Number(j.ride_id) === Number(rideId));
      if (!job) {
        setAcceptError("Job accepted but could not load details. Refreshing…");
        fetchJobs();
        return;
      }

      router.push({
        pathname: "/(root)/driver-tracking",
        params: {
          rideId: String(job.ride_id),
          userName: job.user_name || "Customer",
          originAddress: job.origin_address,
          originLat: String(job.origin_latitude ?? ""),
          originLng: String(job.origin_longitude ?? ""),
          farePrice: String(job.fare_price),
        },
      });
    } catch (err: any) {
      const msg = err?.message ?? "";
      setAcceptError(
        msg.includes("409")
          ? "This job was just accepted by another collector."
          : "Failed to accept job. Please try again."
      );
    } finally {
      setAccepting(null);
    }
  };

  const handleReject = async (rideId: number) => {
    await stopAlert();
    rejectedIds.current.add(rideId);
    setJobs((prev) => prev.filter((j) => j.ride_id !== rideId));
    if (user?.id) {
      fetchAPI("/(api)/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId, driverClerkId: user.id, action: "reject" }),
      }).catch(() => {});
    }
  };


  // ── Render ───────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.ride_id.toString()}
        renderItem={({ item }) => (
          <RequestCard
            job={item}
            onAccept={handleAccept}
            onReject={handleReject}
            accepting={accepting}
          />
        )}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={[styles.greeting, { color: t.subText }]}>
                  Welcome back,
                </Text>
                <Text style={[styles.name, { color: BLUE }]}>{displayName}</Text>
              </View>
              <View style={styles.headerActions}>
                {/* Dark / light toggle */}
                <TouchableOpacity
                  onPress={toggleTheme}
                  style={[styles.iconBtn, { backgroundColor: t.card }]}
                >
                  <Ionicons
                    name={isDark ? "sunny-outline" : "moon-outline"}
                    size={20}
                    color={isDark ? "#FBBF24" : BLUE}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={performSignOut}
                  disabled={signingOut}
                  style={[styles.iconBtn, { backgroundColor: t.card }]}
                >
                  <Ionicons name="log-out-outline" size={22} color={BLUE} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Online toggle */}
            <View
              style={[
                styles.onlineCard,
                {
                  backgroundColor: t.card,
                  borderColor: isOnline ? GREEN : t.border,
                },
              ]}
            >
              <View style={styles.onlineLeft}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: isOnline ? GREEN : t.muted },
                  ]}
                />
                <View>
                  <Text style={[styles.onlineTitle, { color: t.text }]}>
                    {isOnline ? "You're Online" : "You're Offline"}
                  </Text>
                  <Text style={[styles.onlineSub, { color: t.subText }]}>
                    {isOnline
                      ? "Incoming requests will appear below"
                      : "Toggle to start receiving collection requests"}
                  </Text>
                </View>
              </View>
              <Switch
                value={isOnline}
                onValueChange={setIsOnline}
                trackColor={{ false: t.border, true: "#BBF7D0" }}
                thumbColor={isOnline ? GREEN : t.muted}
              />
            </View>

            {/* Active job resume banner */}
            {activeJob && (
              <TouchableOpacity
                style={styles.resumeBanner}
                onPress={() =>
                  router.push({
                    pathname: "/(root)/driver-tracking",
                    params: {
                      rideId: String(activeJob.ride_id),
                      userName: activeJob.user_name || "Customer",
                      originAddress: activeJob.origin_address,
                      originLat: String(activeJob.origin_latitude ?? ""),
                      originLng: String(activeJob.origin_longitude ?? ""),
                      farePrice: String(activeJob.fare_price),
                    },
                  })
                }
                activeOpacity={0.85}
              >
                <View style={styles.resumeBannerLeft}>
                  <View style={styles.resumePulse} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resumeBannerTitle}>Active Job In Progress</Text>
                    <Text style={styles.resumeBannerSub} numberOfLines={1}>
                      {activeJob.origin_address} · Tap to resume
                    </Text>
                  </View>
                </View>
                <Ionicons name="navigate-outline" size={18} color="#fff" />
              </TouchableOpacity>
            )}

            {/* Accept error banner */}
            {!!acceptError && (
              <View
                style={[
                  styles.errorBanner,
                  { backgroundColor: isDark ? "#2A1414" : "#FEF2F2" },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.errorBannerText}>{acceptError}</Text>
              </View>
            )}

            {/* Section title */}
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>
                {isOnline ? "Incoming Requests" : "Go online to receive requests"}
              </Text>
              {isOnline && loadingJobs && (
                <ActivityIndicator size="small" color={BLUE} />
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          isOnline ? (
            loadingJobs ? null : (
              <View style={styles.empty}>
                <Ionicons name="hourglass-outline" size={52} color={t.muted} />
                <Text style={[styles.emptyTitle, { color: t.text }]}>
                  No requests yet
                </Text>
                <Text style={[styles.emptySub, { color: t.subText }]}>
                  Waiting for new collection requests in your area…
                </Text>
              </View>
            )
          ) : (
            <View style={styles.empty}>
              <Ionicons name="power-outline" size={52} color={t.muted} />
              <Text style={[styles.emptyTitle, { color: t.text }]}>
                You're offline
              </Text>
              <Text style={[styles.emptySub, { color: t.subText }]}>
                Toggle the switch above to go online and start accepting jobs
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

export default Dashboard;

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 110 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  greeting: { fontSize: 14 },
  headerActions: { flexDirection: "row", gap: 10 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  onlineCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  onlineLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  onlineTitle: { fontSize: 15, fontWeight: "700" },
  onlineSub: { fontSize: 12, marginTop: 2 },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700" },

  requestCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  requestTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  userPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  userName: { fontSize: 13, fontWeight: "600" },
  timeAgo: { fontSize: 12 },

  routeBlock: { marginBottom: 14, paddingLeft: 4 },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    flexShrink: 0,
  },
  routeText: { fontSize: 14, flex: 1, lineHeight: 20 },
  routeLine: { width: 1.5, height: 16, marginLeft: 4, marginVertical: 2 },

  fareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  fareLabel: { fontSize: 13, flex: 1 },
  fareAmount: { fontSize: 18, fontWeight: "800", color: BLUE },

  actionRow: { flexDirection: "row", gap: 10 },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
  },
  rejectBtnText: { color: "#EF4444", fontWeight: "700", fontSize: 14 },
  acceptBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 12,
  },
  acceptBtnLoading: { backgroundColor: "#86EFAC" },
  acceptBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  resumeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: GREEN,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  resumeBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  resumePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
    opacity: 0.9,
  },
  resumeBannerTitle: { fontSize: 14, fontWeight: "700", color: "#fff" },
  resumeBannerSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorBannerText: { color: "#EF4444", fontSize: 13, flex: 1 },

  empty: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 20,
  },
});
