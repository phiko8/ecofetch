import { fetchAPI } from "@/lib/fetch";
import { DRIVER_DARK, DRIVER_LIGHT, useThemeStore } from "@/store";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BLUE = "#F97316";
const GREEN = "#1AB045";
const POLL_MS = 5000;

type JobStatus = "pending" | "accepted" | "completed" | "rejected" | "cancelled";

interface Job {
  ride_id: number;
  origin_address: string;
  destination_address: string | null;
  origin_latitude: number | null;
  origin_longitude: number | null;
  fare_price: number;
  offered_price: number | null;
  floor_price: number | null;
  counter_price: number | null;
  negotiation_status: string | null;
  offer_expires_at: string | null;
  status: JobStatus;
  created_at: string;
  user_name: string | null;
  waste_photo: string | null;
}

const STATUS_COLORS: Record<JobStatus, string> = {
  pending: GREEN,
  accepted: BLUE,
  completed: "#6B7280",
  rejected: "#EF4444",
};

const FILTERS: { label: string; value: JobStatus }[] = [
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Completed", value: "completed" },
  { label: "Rejected", value: "rejected" },
];

const JobCard = ({
  job,
  onAccept,
  onReject,
  onComplete,
  onCounter,
  accepting,
  rejecting,
  countering,
  onPhotoPress,
}: {
  job: Job;
  onAccept: (job: Job) => void;
  onReject: (id: number) => void;
  onComplete: (id: number) => void;
  onCounter: (job: Job) => void;
  accepting: boolean;
  rejecting: boolean;
  countering: boolean;
  onPhotoPress: (uri: string) => void;
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const t = isDark ? DRIVER_DARK : DRIVER_LIGHT;

  const offeredPrice = Number(job.offered_price ?? job.fare_price);
  const floorPrice   = Number(job.floor_price ?? 0);

  return (
    <View style={[styles.card, { backgroundColor: t.card }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="location-outline" size={16} color={BLUE} />
          <Text style={[styles.cardTitle, { color: t.text }]} numberOfLines={2}>
            {job.origin_address}
          </Text>
        </View>
        <View
          style={[styles.badge, { backgroundColor: STATUS_COLORS[job.status] }]}
        >
          <Text style={styles.badgeText}>{job.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Offer / floor price row — show on pending jobs */}
      {job.status === "pending" && (
        <View style={styles.offerRow}>
          <View style={styles.offerPill}>
            <Ionicons name="cash-outline" size={14} color={GREEN} />
            <Text style={styles.offerPillText}>
              Offered: R {offeredPrice.toFixed(0)}
            </Text>
          </View>
          {floorPrice > 0 && (
            <Text style={styles.floorText}>
              Floor: R {floorPrice.toFixed(0)}
            </Text>
          )}
        </View>
      )}

      {job.destination_address ? (
        <View style={styles.detailItem}>
          <Ionicons name="flag-outline" size={14} color={t.subText} />
          <Text
            style={[styles.detailText, { color: t.subText }]}
            numberOfLines={1}
          >
            {job.destination_address}
          </Text>
        </View>
      ) : null}

      {job.user_name ? (
        <View style={styles.detailItem}>
          <Ionicons name="person-outline" size={14} color={t.subText} />
          <Text style={[styles.detailText, { color: t.subText }]}>
            Requested by {job.user_name}
          </Text>
        </View>
      ) : null}

      {job.waste_photo ? (
        <TouchableOpacity
          style={styles.wastePhotoContainer}
          onPress={() => onPhotoPress(job.waste_photo!)}
          activeOpacity={0.85}
        >
          <View style={styles.wastePhotoLabel}>
            <Ionicons name="camera-outline" size={13} color={GREEN} />
            <Text style={styles.wastePhotoLabelText}>Waste Photo — tap to enlarge</Text>
          </View>
          <Image
            source={{ uri: job.waste_photo }}
            style={styles.wastePhoto}
            resizeMode="cover"
          />
          <View style={styles.wastePhotoHint}>
            <Ionicons name="expand-outline" size={14} color="#6B7280" />
            <Text style={styles.wastePhotoHintText}>Tap to view full screen</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.payment}>
          R{Number(job.offered_price ?? job.fare_price).toFixed(0)}
        </Text>
        {job.status === "pending" && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#EF4444" }, rejecting && { opacity: 0.6 }]}
              onPress={() => onReject(job.ride_id)}
              disabled={rejecting || accepting || countering}
              activeOpacity={0.8}
            >
              {rejecting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.actionBtnText}>Reject</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#F59E0B" }, countering && { opacity: 0.6 }]}
              onPress={() => onCounter(job)}
              disabled={accepting || rejecting || countering}
              activeOpacity={0.8}
            >
              {countering
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.actionBtnText}>Counter</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: GREEN }, accepting && { opacity: 0.6 }]}
              onPress={() => onAccept(job)}
              disabled={accepting || rejecting || countering}
              activeOpacity={0.8}
            >
              {accepting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.actionBtnText}>Accept</Text>}
            </TouchableOpacity>
          </View>
        )}
        {job.status === "accepted" && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: BLUE }]}
              onPress={() => onComplete(job.ride_id)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: GREEN }]}
              onPress={() =>
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
                })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Track</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const Jobs = () => {
  const { user } = useUser();
  const isDark = useThemeStore((s) => s.isDark);
  const t = isDark ? DRIVER_DARK : DRIVER_LIGHT;

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [filter, setFilter] = useState<JobStatus>("pending");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting,  setAccepting]  = useState<number | null>(null);
  const [rejecting,  setRejecting]  = useState<number | null>(null);
  const [countering, setCountering] = useState<number | null>(null);
  const [counterJob,    setCounterJob]    = useState<Job | null>(null);
  const [counterInput,  setCounterInput]  = useState("");
  const [counterError,  setCounterError]  = useState("");
  const [actionError, setActionError] = useState<string>("");
  const [showAlert, setShowAlert] = useState(false);
  const alertAnim = useRef(new Animated.Value(-80)).current;
  const prevPendingCount = useRef(0);

  const fetchJobs = useCallback(
    async (silent = false) => {
      if (!user?.id) return;
      if (!silent) setLoading(true);
      try {
        const res = await fetchAPI(
          `/(api)/jobs?filter=${filter}&driverClerkId=${user.id}`
        );
        const fetched: Job[] = res.data ?? [];
        setJobs(fetched);

        if (
          filter === "pending" &&
          prevPendingCount.current > 0 &&
          fetched.length > prevPendingCount.current
        ) {
          triggerAlert();
        }
        if (filter === "pending") prevPendingCount.current = fetched.length;
      } catch {
        // silently fail on poll errors
      } finally {
        setLoading(false);
      }
    },
    [user?.id, filter]
  );

  const triggerAlert = () => {
    setShowAlert(true);
    Animated.sequence([
      Animated.spring(alertAnim, { toValue: 0, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(alertAnim, {
        toValue: -80,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowAlert(false));
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(() => fetchJobs(true), POLL_MS);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleAccept = async (job: Job) => {
    if (!user?.id) return;
    setActionError("");
    setAccepting(job.ride_id);
    try {
      await fetchAPI("/(api)/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId: job.ride_id,
          driverClerkId: user.id,
          action: "accept",
        }),
      });

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
    } catch {
      setActionError("Failed to accept job. Please try again.");
    } finally {
      setAccepting(null);
    }
  };

  const handleReject = async (rideId: number) => {
    if (!user?.id) return;
    setActionError("");
    setRejecting(rideId);
    try {
      await fetchAPI("/(api)/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId,
          driverClerkId: user.id,
          action: "reject",
        }),
      });
      await fetchJobs(true);
    } catch {
      setActionError("Failed to reject job. Please try again.");
    } finally {
      setRejecting(null);
    }
  };

  const handleComplete = async (rideId: number) => {
    if (!user?.id) return;
    setActionError("");
    try {
      await fetchAPI("/(api)/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId, driverClerkId: user.id, action: "complete" }),
      });
      await fetchJobs(true);
    } catch {
      setActionError("Failed to complete job. Please try again.");
    }
  };

  // Open counter modal
  const handleCounter = (job: Job) => {
    setCounterJob(job);
    setCounterInput(String(Number(job.offered_price ?? job.fare_price).toFixed(2)));
    setCounterError("");
  };

  // Submit counter-offer to API
  const submitCounter = async () => {
    if (!user?.id || !counterJob) return;
    const cp = parseFloat(counterInput);
    const floor = Number(counterJob.floor_price ?? 0);
    if (isNaN(cp) || cp < floor) {
      setCounterError(`Minimum is R ${floor.toFixed(2)}`);
      return;
    }
    setCounterError("");
    setCountering(counterJob.ride_id);
    try {
      await fetchAPI("/(api)/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId: counterJob.ride_id,
          driverClerkId: user.id,
          action: "counter",
          counterPrice: cp,
        }),
      });
      setCounterJob(null);
      await fetchJobs(true);
    } catch {
      setCounterError("Failed to send counter. Please try again.");
    } finally {
      setCountering(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      {/* New job alert banner */}
      {showAlert && (
        <Animated.View
          style={[
            styles.alertBanner,
            { transform: [{ translateY: alertAnim }] },
          ]}
        >
          <Ionicons name="notifications" size={18} color="#fff" />
          <Text style={styles.alertText}>New collection request!</Text>
        </Animated.View>
      )}

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.ride_id.toString()}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onAccept={handleAccept}
            onReject={handleReject}
            onComplete={handleComplete}
            onCounter={handleCounter}
            accepting={accepting === item.ride_id}
            rejecting={rejecting === item.ride_id}
            countering={countering === item.ride_id}
            onPhotoPress={(uri) => setPhotoPreview(uri)}
          />
        )}
        style={styles.list}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={[styles.header, { color: BLUE }]}>
              Collection Jobs
            </Text>
            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    styles.chip,
                    { borderColor: t.border, backgroundColor: t.chipBg },
                    filter === f.value && styles.chipActive,
                  ]}
                  onPress={() => setFilter(f.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: t.subText },
                      filter === f.value && styles.chipTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {!!actionError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#fff" />
                <Text style={styles.errorBannerText}>{actionError}</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={BLUE} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="briefcase-outline" size={52} color={t.muted} />
              <Text style={[styles.emptyTitle, { color: t.text }]}>
                {filter === "pending"
                  ? "No pending requests"
                  : `No ${filter} jobs`}
              </Text>
              <Text style={[styles.emptySub, { color: t.subText }]}>
                {filter === "pending"
                  ? "Waiting for collection requests from disposers"
                  : "Nothing here yet"}
              </Text>
            </View>
          )
        }
      />

      {/* ── Counter-offer modal ────────────────────────────────── */}
      <Modal
        visible={!!counterJob}
        transparent
        animationType="slide"
        onRequestClose={() => setCounterJob(null)}
      >
        <View style={styles.counterOverlay}>
          <View style={styles.counterSheet}>
            <View style={styles.counterHandle} />
            <Text style={styles.counterTitle}>Send Counter Offer</Text>
            {counterJob && (
              <>
                <View style={styles.counterInfoRow}>
                  <Text style={styles.counterInfoLabel}>Customer offered</Text>
                  <Text style={styles.counterInfoValue}>
                    R {Number(counterJob.offered_price ?? counterJob.fare_price).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.counterInfoRow}>
                  <Text style={styles.counterInfoLabel}>Floor price (minimum)</Text>
                  <Text style={[styles.counterInfoValue, { color: "#EF4444" }]}>
                    R {Number(counterJob.floor_price ?? 0).toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.counterHint}>
                  Enter your price. It must be at or above the floor price.
                </Text>
                <View style={styles.counterInputRow}>
                  <Text style={styles.counterRPrefix}>R</Text>
                  <TextInput
                    style={styles.counterInput}
                    value={counterInput}
                    onChangeText={setCounterInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    autoFocus
                  />
                </View>
                {!!counterError && (
                  <Text style={styles.counterError}>{counterError}</Text>
                )}
                <View style={styles.counterBtnRow}>
                  <TouchableOpacity
                    style={styles.counterCancelBtn}
                    onPress={() => setCounterJob(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.counterCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.counterSubmitBtn, countering !== null && { opacity: 0.6 }]}
                    onPress={submitCounter}
                    disabled={countering !== null}
                    activeOpacity={0.85}
                  >
                    {countering !== null
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.counterSubmitText}>Send Counter</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Full-screen waste photo modal */}
      <Modal
        visible={!!photoPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPreview(null)}
      >
        <View style={styles.photoModal}>
          <TouchableOpacity
            style={styles.photoModalClose}
            onPress={() => setPhotoPreview(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          {photoPreview ? (
            <Image
              source={{ uri: photoPreview }}
              style={styles.photoModalImage}
              resizeMode="contain"
            />
          ) : null}
          <View style={styles.photoModalCaption}>
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={styles.photoModalCaptionText}>Waste photo from customer</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Jobs;

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 20 },
  content: { paddingBottom: 110 },

  alertBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  alertText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  header: {
    fontSize: 24,
    marginTop: 20,
    marginBottom: 12,
  },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: BLUE, borderColor: BLUE },
  chipText: { fontSize: 13, fontWeight: "500" },
  chipTextActive: { color: "#fff" },

  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 6,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { fontSize: 13, flex: 1 },
  wastePhotoContainer: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  wastePhotoLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F0FDF4",
  },
  wastePhotoLabelText: { fontSize: 12, color: "#166534", fontWeight: "600" },
  wastePhoto: { width: "100%", height: 160 },
  wastePhotoHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
  },
  wastePhotoHintText: { fontSize: 11, color: "#6B7280" },

  // Full-screen photo modal
  photoModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoModalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoModalImage: {
    width: "100%",
    height: "75%",
  },
  photoModalCaption: {
    position: "absolute",
    bottom: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  photoModalCaptionText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  payment: { fontSize: 22, fontWeight: "800", color: BLUE },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 72,
    alignItems: "center",
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Offer / floor row on card
  offerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  offerPill: { flexDirection: "row", alignItems: "center", gap: 5 },
  offerPillText: { fontSize: 13, fontWeight: "700", color: "#166534" },
  floorText: { fontSize: 12, color: "#EF4444", fontWeight: "600" },

  // Counter modal
  counterOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  counterSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 14,
    gap: 10,
  },
  counterHandle: {
    width: 40, height: 4, backgroundColor: "#E5E7EB",
    borderRadius: 2, alignSelf: "center", marginBottom: 8,
  },
  counterTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  counterInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  counterInfoLabel: { fontSize: 13, color: "#6B7280" },
  counterInfoValue: { fontSize: 14, fontWeight: "700", color: "#111" },
  counterHint: {
    fontSize: 12, color: "#9CA3AF", lineHeight: 16,
    borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 8,
  },
  counterInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F97316",
    paddingHorizontal: 14,
    gap: 6,
    marginTop: 4,
  },
  counterRPrefix: { fontSize: 20, fontWeight: "700", color: "#F97316" },
  counterInput: {
    flex: 1, fontSize: 24, fontWeight: "800", color: "#111", paddingVertical: 12,
  },
  counterError: { fontSize: 12, color: "#EF4444", fontWeight: "600" },
  counterBtnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  counterCancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 13,
    backgroundColor: "#F3F4F6", alignItems: "center",
  },
  counterCancelText: { fontSize: 15, fontWeight: "700", color: "#6B7280" },
  counterSubmitBtn: {
    flex: 2, borderRadius: 12, paddingVertical: 13,
    backgroundColor: "#F97316", alignItems: "center",
  },
  counterSubmitText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorBannerText: { color: "#fff", fontSize: 13, fontWeight: "600", flex: 1 },

  empty: {
    alignItems: "center",
    marginTop: 60,
    gap: 8,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center" },
});
