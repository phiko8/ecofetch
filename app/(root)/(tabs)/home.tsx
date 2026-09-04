import DisposalCard from "@/components/DisposalCard";
import Map from "@/components/Map";
import { images } from "@/constants";
import { useFetch } from "@/lib/fetch";
import { useDriverStore, useLocationStore } from "@/store";
import { generateMarkersFromData } from "@/lib/map";
import { Disposal } from "@/types/type";
import { useUser } from "@clerk/clerk-expo";
import { useSignOut } from "@/lib/useSignOut";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface CollectorDriver {
  id: number;
  name: string;
  vehicle_type: string;
  phone: string;
  area: string | null;
  number_plate: string;
}

const GREEN = "#1AB045";
const { height: SCREEN_H } = Dimensions.get("window");
const SNAP_COLLAPSED = Math.max(SCREEN_H * 0.40, 280);
const SNAP_EXPANDED  = SCREEN_H * 0.88;

const SERVICES = [
  {
    label: "Waste\nDisposal",
    sub: "Quick pickup",
    purpose: "dispose",
    color: GREEN,
    image: images.serviceDisposal,
  },
  {
    label: "Recycling",
    sub: "Eco-friendly",
    purpose: "recycle",
    color: "#059669",
    image: images.serviceRecycling,
  },
  {
    label: "Bin\nCleaning",
    sub: "Deep clean",
    purpose: "bin_cleaning",
    color: "#0284C7",
    image: images.serviceCleaning,
  },
] as const;

export default function Home() {
  const { setUserLocation, userLatitude, userLongitude } = useLocationStore();
  const { setDrivers } = useDriverStore();
  const { user } = useUser();
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const { performSignOut, loading: signingOut } = useSignOut();

  // ── Multi-select services ────────────────────────────────────────
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());

  const toggleService = (purpose: string) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(purpose)) next.delete(purpose);
      else next.add(purpose);
      return next;
    });
  };

  const handleBookSelected = () => {
    const purposes = Array.from(selectedServices);
    if (purposes.length === 0) return;
    setSelectedServices(new Set());
    router.push({
      pathname: "/(root)/find-collector",
      params: {
        purpose: purposes[0],
        extraPurposes: purposes.slice(1).join(","),
      },
    });
  };

  // ── Draggable bottom sheet ──────────────────────────────────────
  const sheetHeight  = useRef(new Animated.Value(SNAP_COLLAPSED)).current;
  const currentH     = useRef(SNAP_COLLAPSED);
  const startH       = useRef(SNAP_COLLAPSED);

  useEffect(() => {
    const id = sheetHeight.addListener(({ value }) => { currentH.current = value; });
    return () => sheetHeight.removeListener(id);
  }, []);

  const snapTo = (target: number) => {
    Animated.spring(sheetHeight, {
      toValue: target,
      useNativeDriver: false,
      bounciness: 3,
    }).start();
  };

  const panHandle = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 4,
      onPanResponderGrant: () => { startH.current = currentH.current; },
      onPanResponderMove: (_, { dy }) => {
        const next = Math.min(
          Math.max(startH.current - dy, SNAP_COLLAPSED),
          SNAP_EXPANDED,
        );
        sheetHeight.setValue(next);
      },
      onPanResponderRelease: (_, { vy }) => {
        const mid = (SNAP_COLLAPSED + SNAP_EXPANDED) / 2;
        const goUp = vy < -0.5 || currentH.current > mid;
        snapTo(goUp ? SNAP_EXPANDED : SNAP_COLLAPSED);
      },
    })
  ).current;

  // ── Data fetching ───────────────────────────────────────────────
  const { data: recentDisposals, loading } = useFetch<Disposal[]>(
    user?.id ? `/(api)/Disposal/${user.id}?limit=10` : null
  );

  const activeRide = (recentDisposals ?? []).find(
    (d) => d.status === "pending" || d.status === "accepted"
  );

  const driversUrl =
    userLatitude && userLongitude
      ? `/(api)/drivers?lat=${userLatitude}&lng=${userLongitude}`
      : "/(api)/drivers";

  const { data: collectors } = useFetch<CollectorDriver[]>(driversUrl);

  useEffect(() => {
    const requestLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Required",
          "Please enable location access in Settings to find collectors near you."
        );
        return;
      }
      let location = await Location.getCurrentPositionAsync();
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      const addr = `${address[0].name}, ${address[0].region}`;
      setLocationAddress(addr);
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: addr,
      });
    };
    requestLocation();
  }, []);

  useEffect(() => {
    if (collectors && collectors.length > 0 && userLatitude && userLongitude) {
      const markers = generateMarkersFromData({
        data: collectors as any,
        userLatitude,
        userLongitude,
      });
      setDrivers(markers);
    }
  }, [collectors, userLatitude, userLongitude]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const userName =
    user?.firstName ||
    user?.emailAddresses[0]?.emailAddress.split("@")[0] ||
    "User";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>

      {/* ── Map area ────────────────────────────────────────────── */}
      <View style={styles.mapArea}>
        <View style={StyleSheet.absoluteFill}>
          <Map />
        </View>

        {/* Top overlay */}
        <View style={styles.topOverlay} pointerEvents="box-none">
          <View style={styles.headerCard} pointerEvents="auto">
            <View>
              <Text style={styles.greeting}>Hello,</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
            <TouchableOpacity
              onPress={performSignOut}
              disabled={signingOut}
              style={styles.signOutBtn}
              activeOpacity={0.8}
            >
              <Ionicons
                name={signingOut ? "hourglass-outline" : "log-out-outline"}
                size={20}
                color={GREEN}
              />
            </TouchableOpacity>
          </View>

          {locationAddress && (
            <View style={styles.locationPill} pointerEvents="none">
              <Ionicons name="location-sharp" size={14} color={GREEN} />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationAddress}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Draggable bottom sheet ───────────────────────────────── */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>

        {/* Drag handle — pan gesture lives here */}
        <View style={styles.handleArea} {...panHandle.panHandlers}>
          <View style={styles.sheetHandle} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true}
          indicatorStyle="black"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.sheetScroll}
        >
          {/* Active ride resume banner */}
          {activeRide && (
            <TouchableOpacity
              style={styles.resumeBanner}
              onPress={() =>
                router.push({
                  pathname: "/(root)/track-collector",
                  params: {
                    rideId: String(activeRide.ride_id),
                    driverName: activeRide.driver
                      ? `${activeRide.driver.first_name}${activeRide.driver.last_name ? " " + activeRide.driver.last_name : ""}`
                      : "",
                    farePrice: String(activeRide.fare_price),
                  },
                })
              }
              activeOpacity={0.85}
            >
              <View style={styles.resumeLeft}>
                <View style={styles.resumePulse} />
                <View>
                  <Text style={styles.resumeTitle}>Collection In Progress</Text>
                  <Text style={styles.resumeSub} numberOfLines={1}>
                    {activeRide.driver
                      ? `${activeRide.driver.first_name} is on the way · Tap to track`
                      : "Searching for a collector · Tap to track"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </TouchableOpacity>
          )}

          {/* ── Services ──────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>Our Services</Text>
          <Text style={styles.sectionSub}>
            Request a collector or bin cleaner — we'll connect you in real time.
          </Text>

          <View style={styles.serviceRow}>
            {SERVICES.map(({ label, sub, purpose, color, image }) => {
              const isSelected = selectedServices.has(purpose);
              return (
                <TouchableOpacity
                  key={purpose}
                  style={[
                    styles.serviceCard,
                    isSelected && { borderColor: color, borderWidth: 2.5 },
                  ]}
                  onPress={() => toggleService(purpose)}
                  activeOpacity={0.82}
                >
                  {/* Selected checkmark badge */}
                  {isSelected && (
                    <View style={[styles.serviceCheck, { backgroundColor: color }]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                  <Image source={image} style={styles.serviceCardImg} resizeMode="contain" />
                  <View style={[styles.serviceCardFooter, { backgroundColor: color }]}>
                    <Text style={styles.serviceCardLabel}>{label}</Text>
                    <Text style={styles.serviceCardSub}>{sub}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Request Selected CTA — appears when ≥1 service is selected */}
          {selectedServices.size > 0 && (
            <TouchableOpacity
              style={styles.bookSelectedBtn}
              onPress={handleBookSelected}
              activeOpacity={0.88}
            >
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={styles.bookSelectedText}>
                Request {selectedServices.size} Service{selectedServices.size > 1 ? "s" : ""}
              </Text>
              <View style={styles.bookSelectedChip}>
                <Text style={styles.bookSelectedChipText}>{selectedServices.size}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Recent pickups */}
          <Text style={styles.sectionLabel}>Recent Pickups</Text>
          <FlatList
            data={(recentDisposals ?? []).slice(0, 5)}
            renderItem={({ item }) => <DisposalCard disposal={item} />}
            keyExtractor={(item) => item.ride_id.toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
              <View style={styles.emptyWrap}>
                <Image
                  source={images.noResult}
                  style={styles.emptyImg}
                  accessibilityLabel="No recent pickups"
                />
                <Text style={styles.emptyText}>No recent pickups</Text>
                <Text style={styles.emptySub}>
                  Select a service above to get started
                </Text>
              </View>
            )}
          />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", flexDirection: "column" },
  mapArea: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 15, color: "#6B7280" },

  // ── Top overlay ──────────────────────────────────────────────
  topOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 20,
    paddingTop: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 6,
  },
  greeting: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
  userName: { fontSize: 18, fontWeight: "800", color: "#111", marginTop: 1 },
  signOutBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "#F0FDF4",
    alignItems: "center", justifyContent: "center",
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  locationText: { fontSize: 13, color: "#374151", maxWidth: 260 },

  // ── Bottom sheet ─────────────────────────────────────────────
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 20,
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 60, // wide hit target for the drag
  },
  sheetHandle: {
    width: 36, height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
  },

  // Active ride banner
  resumeBanner: {
    backgroundColor: "#1AB045",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    shadowColor: "#1AB045",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 5,
  },
  resumeLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  resumePulse: {
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: "#fff", opacity: 0.9,
  },
  resumeTitle: { fontSize: 13, fontWeight: "700", color: "#fff" },
  resumeSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },

  // ── Service cards ─────────────────────────────────────────────
  serviceRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  serviceCard: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2.5,
    borderColor: "transparent",
  },
  serviceCheck: {
    position: "absolute",
    top: 6, right: 6,
    zIndex: 10,
    width: 22, height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  serviceCardImg: {
    width: "100%", height: 100,
    backgroundColor: "#F0FDF4",
  },
  serviceCardFooter: {
    paddingHorizontal: 8, paddingVertical: 9,
    alignItems: "center", gap: 2,
  },
  serviceCardLabel: {
    fontSize: 11, fontWeight: "800",
    textAlign: "center", lineHeight: 14, color: "#fff",
  },
  serviceCardSub: {
    fontSize: 9, fontWeight: "500",
    color: "rgba(255,255,255,0.82)", textAlign: "center",
  },

  // Request Selected CTA
  bookSelectedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#1AB045",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 18,
    shadowColor: "#1AB045",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 5,
  },
  bookSelectedText: {
    fontSize: 15, fontWeight: "800", color: "#fff", flex: 1,
  },
  bookSelectedChip: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  bookSelectedChipText: {
    fontSize: 13, fontWeight: "800", color: "#fff",
  },

  // Section labels
  sectionLabel: {
    fontSize: 16, fontWeight: "700", color: "#111",
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  sectionSub: {
    fontSize: 13, color: "#6B7280",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sheetScroll: { paddingBottom: 12, paddingHorizontal: 20 },
  listContent: { paddingBottom: 8 },

  // Empty state
  emptyWrap: { alignItems: "center", paddingTop: 8 },
  emptyImg: { width: 110, height: 110 },
  emptyText: {
    fontSize: 15, fontWeight: "700", color: "#374151", marginTop: 10,
  },
  emptySub: {
    fontSize: 13, color: "#9CA3AF", marginTop: 4, textAlign: "center",
  },
});
