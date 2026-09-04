import PaymentSheet from "@/components/PaymentSheet";
import { fetchAPI } from "@/lib/fetch";
import { useLocationStore } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ReactNativeModal from "react-native-modal";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

const GREEN = "#1AB045";
const BLUE = "#1E3A5F";
const POLL_MS = 3000;          // poll driver location every 3 s
const ROUTE_REFRESH_MS = 30000; // hard refresh every 30 s

// Decode Google's encoded polyline into lat/lng array
function decodePolyline(
  encoded: string
): { latitude: number; longitude: number }[] {
  const coords: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return coords;
}

const OFFER_TIMEOUT_SEC = 180; // 3 minutes

interface DriverLocation {
  latitude: number | null;
  longitude: number | null;
  updated_at: string | null;
  driver_name: string;
  vehicle_type: string;
  status: string;
  negotiation_status: string;
  counter_price: number | null;
  floor_price: number | null;
  offered_price: number | null;
  offer_expires_at: string | null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting for driver to start",
  accepted: "Driver is on the way",
  completed: "Collection complete!",
  rejected: "Driver rejected this trip",
  cancelled: "Request cancelled",
};

export default function TrackCollector() {
  const { rideId, driverName, farePrice } = useLocalSearchParams();
  const isBroadcast = !String(driverName ?? "");
  const mapRef = useRef<MapView>(null);

  // Use stored location from home screen as immediate starting point
  const storedLat = useLocationStore((s) => s.userLatitude);
  const storedLng = useLocationStore((s) => s.userLongitude);

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(
    storedLat && storedLng ? { latitude: storedLat, longitude: storedLng } : null
  );

  const [driver, setDriver] = useState<DriverLocation>({
    latitude: null,
    longitude: null,
    updated_at: null,
    driver_name: String(driverName ?? ""),
    vehicle_type: "",
    status: "pending",
    negotiation_status: "open",
    counter_price: null,
    floor_price: null,
    offered_price: null,
    offer_expires_at: null,
  });

  // ── Countdown timer (seconds remaining until offer expires) ───────────────
  const [countdown, setCountdown] = useState<number | null>(null);

  // ── Negotiation state ─────────────────────────────────────────────────────
  const [userCounterInput, setUserCounterInput] = useState("");
  const [userCounterError, setUserCounterError] = useState("");
  const [negotiating, setNegotiating] = useState(false);
  const [showUserCounter, setShowUserCounter] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [eta, setEta] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [routeFailed, setRouteFailed] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const paymentShownRef = useRef(false);
  const [ratingVisible, setRatingVisible] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const driverLocationRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const userLocationRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(
    storedLat && storedLng ? { latitude: storedLat, longitude: storedLng } : null
  );
  const lastRouteFetchPosRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Fetch real road route from driver to user via Google Directions API
  const fetchRoute = useCallback(
    async (
      from: { latitude: number; longitude: number },
      to: { latitude: number; longitude: number }
    ) => {
      const apiKey = process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY;
      if (!apiKey) return;
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json` +
            `?origin=${from.latitude},${from.longitude}` +
            `&destination=${to.latitude},${to.longitude}` +
            `&key=${apiKey}`
        );
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          setRouteCoords(decodePolyline(route.overview_polyline.points));
          setRouteFailed(false);
          const durationText: string | undefined =
            route.legs?.[0]?.duration?.text;
          if (durationText) setEta(durationText);
        } else {
          setRouteFailed(true);
        }
      } catch {
        setRouteFailed(true);
      }
    },
    []
  );

  // Get user's own location once
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const pos = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      userLocationRef.current = pos;
      setUserLocation(pos);
    })();
  }, []);

  // Poll driver location
  useEffect(() => {
    if (!rideId) return;

    const poll = async () => {
      try {
        const res = await fetchAPI(`/(api)/driver-location?rideId=${rideId}`);
        if (res?.data) {
          const d = res.data;
          const dLat = d.latitude ? Number(d.latitude) : null;
          const dLng = d.longitude ? Number(d.longitude) : null;
          setDriver({
            latitude: dLat,
            longitude: dLng,
            updated_at: d.updated_at,
            driver_name: d.driver_name ?? String(driverName ?? ""),
            vehicle_type: d.vehicle_type ?? "",
            status: d.status ?? "pending",
            negotiation_status: d.negotiation_status ?? "open",
            counter_price:  d.counter_price  != null ? Number(d.counter_price)  : null,
            floor_price:    d.floor_price    != null ? Number(d.floor_price)    : null,
            offered_price:  d.offered_price  != null ? Number(d.offered_price)  : null,
            offer_expires_at: d.offer_expires_at ?? null,
          });
          // Initialise countdown from server expiry on first load
          if (d.offer_expires_at && countdown === null) {
            const secsLeft = Math.max(
              0,
              Math.round((new Date(d.offer_expires_at).getTime() - Date.now()) / 1000)
            );
            setCountdown(secsLeft);
          }

          // Update ref and fetch route when driver location first arrives
          if (dLat && dLng) {
            const driverPos = { latitude: dLat, longitude: dLng };
            const userPos = userLocationRef.current;
            const prevPos = lastRouteFetchPosRef.current;

            if (!prevPos && userPos) {
              // First driver location — fetch route immediately
              fetchRoute(driverPos, userPos);
              lastRouteFetchPosRef.current = driverPos;
            } else if (prevPos && userPos) {
              const moved = haversineKm(
                prevPos.latitude,
                prevPos.longitude,
                dLat,
                dLng
              );
              if (moved > 0.06) {  // re-fetch route every ~60 m of driver movement
                fetchRoute(driverPos, userPos);
                lastRouteFetchPosRef.current = driverPos;
              }
            }

            driverLocationRef.current = driverPos;
          }
        }
      } catch (_) {
        setError("Could not reach server");
      }
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [rideId, fetchRoute]);

  // Re-fetch route every 45 s
  useEffect(() => {
    const interval = setInterval(() => {
      if (driverLocationRef.current && userLocationRef.current) {
        fetchRoute(driverLocationRef.current, userLocationRef.current);
      }
    }, ROUTE_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchRoute]);

  // Auto-show payment modal when driver marks job complete
  useEffect(() => {
    if (driver.status === "completed" && !paymentShownRef.current) {
      paymentShownRef.current = true;
      setPaymentVisible(true);
    }
  }, [driver.status]);

  // Countdown ticker — counts down 1 second at a time while pending
  useEffect(() => {
    if (driver.status !== "pending" || countdown === null) return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => (c !== null ? Math.max(0, c - 1) : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown, driver.status]);

  // ── Cancel request ──────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!rideId || cancelling) return;
    setCancelling(true);
    try {
      await fetchAPI("/(api)/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId: Number(rideId), action: "cancel" }),
      });
      router.replace("/(root)/find-collector");
    } catch {
      setError("Failed to cancel. Please try again.");
      setCancelling(false);
    }
  };

  // ── Accept driver's counter-offer ────────────────────────────────────────
  const handleAcceptCounter = async () => {
    if (!rideId || negotiating) return;
    setNegotiating(true);
    try {
      await fetchAPI("/(api)/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId: Number(rideId), action: "accept_counter" }),
      });
      // Ride is now accepted — poll will update status
    } catch {
      setError("Failed to accept counter. Try again.");
    } finally {
      setNegotiating(false);
    }
  };

  // ── Send user's counter-offer ────────────────────────────────────────────
  const handleUserCounter = async () => {
    if (!rideId || negotiating) return;
    const up = parseFloat(userCounterInput);
    const floor = driver.floor_price ?? 0;
    if (isNaN(up) || up < floor) {
      setUserCounterError(`Minimum offer: R ${floor.toFixed(2)}`);
      return;
    }
    setUserCounterError("");
    setNegotiating(true);
    try {
      await fetchAPI("/(api)/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId: Number(rideId), action: "user_counter", userOfferPrice: up }),
      });
      setShowUserCounter(false);
      setUserCounterInput("");
    } catch {
      setUserCounterError("Failed to send. Try again.");
    } finally {
      setNegotiating(false);
    }
  };

  // Fit map to show both user and driver
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    const coords = [userLocation];
    if (driver.latitude && driver.longitude) {
      coords.push({ latitude: driver.latitude, longitude: driver.longitude });
    }
    if (coords.length > 1) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 60, bottom: 260, left: 60 },
        animated: true,
      });
    }
  }, [driver.latitude, driver.longitude, userLocation]);

  const handleRate = async (stars: number) => {
    setRatingSubmitting(true);
    try {
      await fetchAPI("/(api)/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId: Number(rideId),
          action: "rate",
          rating: stars,
        }),
      });
      router.replace("/(root)/(tabs)/home");
    } catch {
      setRatingSubmitting(false);
      setError("Failed to submit rating. Please try again.");
    }
  };

  const distanceKm =
    userLocation && driver.latitude && driver.longitude
      ? haversineKm(
          userLocation.latitude,
          userLocation.longitude,
          driver.latitude,
          driver.longitude
        )
      : null;

  const initialRegion = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : {
        latitude: -26.2041,
        longitude: 28.0473,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#111" />
      </TouchableOpacity>

      {/* ETA chip */}
      {eta && (
        <View style={styles.etaChip}>
          <Ionicons name="time-outline" size={14} color={BLUE} />
          <Text style={styles.etaText}>{eta} away</Text>
        </View>
      )}

      {/* Route failed chip */}
      {routeFailed && (
        <TouchableOpacity
          style={styles.routeFailedChip}
          onPress={() => {
            if (driverLocationRef.current && userLocationRef.current) {
              setRouteFailed(false);
              fetchRoute(driverLocationRef.current, userLocationRef.current);
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="warning-outline" size={13} color="#92400E" />
          <Text style={styles.routeFailedText}>Road route unavailable · Tap to retry</Text>
        </TouchableOpacity>
      )}

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Driver marker */}
        {driver.latitude && driver.longitude && (
          <Marker
            coordinate={{
              latitude: driver.latitude,
              longitude: driver.longitude,
            }}
            title={driver.driver_name}
            description={driver.vehicle_type}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.driverMarker}>
              <Ionicons name="car" size={18} color="#fff" />
            </View>
          </Marker>
        )}

        {/* Real road route from driver to user — updates in real time as driver moves */}
        {routeCoords.length > 1 && (
          <>
            {/* White border for contrast */}
            <Polyline
              coordinates={routeCoords}
              strokeColor="#fff"
              strokeWidth={8}
            />
            {/* Main route line */}
            <Polyline
              coordinates={routeCoords}
              strokeColor={BLUE}
              strokeWidth={5}
            />
          </>
        )}

        {/* Fallback straight dashed line if route not yet loaded */}
        {routeCoords.length === 0 && userLocation && driver.latitude && driver.longitude && (
          <Polyline
            coordinates={[
              { latitude: driver.latitude, longitude: driver.longitude },
              userLocation,
            ]}
            strokeColor={BLUE}
            strokeWidth={3}
            lineDashPattern={[8, 6]}
          />
        )}
      </MapView>

      {/* Bottom info panel */}
      <View style={styles.panel}>
        {/* Status pill */}
        <View
          style={[
            styles.statusPill,
            driver.status === "completed" && { backgroundColor: "#F0FDF4" },
            driver.status === "accepted" && { backgroundColor: "#EFF6FF" },
            driver.status === "rejected" && { backgroundColor: "#FEF2F2" },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              driver.status === "accepted" && { backgroundColor: GREEN },
              driver.status === "completed" && { backgroundColor: "#6B7280" },
              driver.status === "rejected" && { backgroundColor: "#EF4444" },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              driver.status === "rejected" && { color: "#EF4444" },
            ]}
          >
            {(!driver.driver_name && driver.status === "pending")
          ? "Broadcasting to nearby collectors…"
          : STATUS_LABEL[driver.status] ?? driver.status}
          </Text>
        </View>

        {/* Driver info */}
        <View style={styles.driverRow}>
          <View style={[styles.driverAvatar, !driver.driver_name && styles.broadcastAvatar]}>
            {driver.driver_name ? (
              <Text style={styles.driverAvatarText}>
                {driver.driver_name.charAt(0).toUpperCase()}
              </Text>
            ) : (
              <Ionicons name="radio-outline" size={22} color={GREEN} />
            )}
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>
              {driver.driver_name || "Searching for collector…"}
            </Text>
            {driver.vehicle_type ? (
              <Text style={styles.driverSub}>{driver.vehicle_type}</Text>
            ) : null}
          </View>
        </View>

        {/* ETA + distance info row */}
        {(distanceKm != null || eta) && driver.status === "accepted" && (
          <View style={styles.infoRow}>
            {distanceKm != null && (
              <View style={styles.infoCard}>
                <Ionicons name="location-outline" size={18} color={GREEN} />
                <Text style={styles.infoVal}>
                  {distanceKm < 1
                    ? `${Math.round(distanceKm * 1000)} m`
                    : `${distanceKm.toFixed(1)} km`}
                </Text>
                <Text style={styles.infoLabel}>away</Text>
              </View>
            )}
            {eta && (
              <View style={styles.infoCard}>
                <Ionicons name="time-outline" size={18} color={BLUE} />
                <Text style={styles.infoVal}>{eta}</Text>
                <Text style={styles.infoLabel}>ETA</Text>
              </View>
            )}
          </View>
        )}

        {(driver.latitude == null || !driver.driver_name) && driver.status !== "completed" && (
          <View style={styles.waitRow}>
            <ActivityIndicator size="small" color={BLUE} />
            <Text style={styles.waitText}>
              {!driver.driver_name && driver.status === "pending"
                ? "Broadcasting to nearby collectors…"
                : driver.status === "pending"
                ? "Waiting for collector to accept…"
                : "Waiting for collector to share location…"}
            </Text>
          </View>
        )}

        {/* ── Countdown + Cancel while pending ──────────────────── */}
        {driver.status === "pending" && (
          <View style={styles.pendingRow}>
            {countdown !== null && countdown > 0 ? (
              <View style={styles.countdownPill}>
                <Ionicons name="time-outline" size={15} color="#F59E0B" />
                <Text style={styles.countdownText}>
                  {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")} remaining
                </Text>
              </View>
            ) : countdown === 0 ? (
              <View style={[styles.countdownPill, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}>
                <Ionicons name="alert-circle-outline" size={15} color="#EF4444" />
                <Text style={[styles.countdownText, { color: "#EF4444" }]}>
                  {isBroadcast ? "No response yet — cancel to retry" : "No response — try next driver"}
                </Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              disabled={cancelling}
              activeOpacity={0.8}
            >
              {cancelling
                ? <ActivityIndicator size="small" color="#EF4444" />
                : <>
                    <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                    <Text style={styles.cancelBtnText}>
                      {isBroadcast ? "Cancel Request" : "Cancel & Try Another"}
                    </Text>
                  </>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Driver counter-offer banner ────────────────────────── */}
        {driver.negotiation_status === "driver_countered" && driver.counter_price != null && (
          <View style={styles.counterBanner}>
            <Text style={styles.counterBannerTitle}>
              Driver proposes: R {driver.counter_price.toFixed(2)}
            </Text>
            {driver.floor_price != null && (
              <Text style={styles.counterBannerFloor}>
                Floor price: R {driver.floor_price.toFixed(2)}
              </Text>
            )}
            {showUserCounter ? (
              <>
                <View style={styles.counterInputRow}>
                  <Text style={styles.counterRPrefix}>R</Text>
                  <TextInput
                    style={styles.counterInput}
                    value={userCounterInput}
                    onChangeText={setUserCounterInput}
                    keyboardType="decimal-pad"
                    placeholder="Your offer"
                    placeholderTextColor="#9CA3AF"
                    autoFocus
                  />
                </View>
                {!!userCounterError && (
                  <Text style={styles.counterErrorText}>{userCounterError}</Text>
                )}
                <View style={styles.counterActionRow}>
                  <TouchableOpacity
                    style={styles.counterDismissBtn}
                    onPress={() => setShowUserCounter(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.counterDismissText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.counterSendBtn, negotiating && { opacity: 0.6 }]}
                    onPress={handleUserCounter}
                    disabled={negotiating}
                    activeOpacity={0.85}
                  >
                    {negotiating
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.counterSendText}>Send Offer</Text>}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.counterActionRow}>
                <TouchableOpacity
                  style={styles.counterMyBtn}
                  onPress={() => {
                    setUserCounterInput(String((driver.offered_price ?? 0).toFixed(2)));
                    setShowUserCounter(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.counterMyText}>Counter Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.counterAcceptBtn, negotiating && { opacity: 0.6 }]}
                  onPress={handleAcceptCounter}
                  disabled={negotiating}
                  activeOpacity={0.85}
                >
                  {negotiating
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.counterAcceptText}>
                        Accept R {driver.counter_price.toFixed(2)}
                      </Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {!!error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {(driver.status === "rejected" || driver.status === "cancelled") && (
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: "#EF4444" }]}
            onPress={() => router.replace("/(root)/find-collector")}
            activeOpacity={0.85}
          >
            <Ionicons name="search-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.doneBtnText}>Find Another Collector</Text>
          </TouchableOpacity>
        )}

        {driver.status === "completed" && (
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => setPaymentVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="wallet-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.doneBtnText}>Pay Now</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Rating Modal ── */}
      <ReactNativeModal isVisible={ratingVisible}>
        <View style={styles.ratingModal}>
          <View style={styles.ratingIconCircle}>
            <Ionicons name="star" size={36} color="#F59E0B" />
          </View>
          <Text style={styles.ratingTitle}>Rate Your Collector</Text>
          <Text style={styles.ratingSub}>
            How was your experience with {String(driverName || driver.driver_name || "your collector")}?
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setSelectedRating(star)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={star <= selectedRating ? "star" : "star-outline"}
                  size={44}
                  color="#F59E0B"
                />
              </TouchableOpacity>
            ))}
          </View>

          {selectedRating > 0 && (
            <Text style={styles.ratingLabel}>
              {["", "Poor", "Fair", "Good", "Great", "Excellent!"][selectedRating]}
            </Text>
          )}

          {ratingSubmitting ? (
            <ActivityIndicator color={GREEN} style={{ marginTop: 16 }} />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.rateBtn, !selectedRating && styles.rateBtnDisabled]}
                onPress={() => selectedRating && handleRate(selectedRating)}
                disabled={!selectedRating}
                activeOpacity={0.85}
              >
                <Text style={styles.rateBtnText}>Submit Rating</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => router.replace("/(root)/(tabs)/home")}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ReactNativeModal>

      <PaymentSheet
        visible={paymentVisible}
        rideId={String(rideId ?? "")}
        farePrice={String(farePrice ?? "0")}
        driverName={String(driverName ?? "Collector")}
        onSuccess={() => {
          setPaymentVisible(false);
          // Wait for the payment modal's close animation to finish
          // before opening the rating modal, otherwise it glitches
          setTimeout(() => setRatingVisible(true), 450);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },

  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  etaChip: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 16,
    alignSelf: "center",
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  etaText: { fontSize: 13, fontWeight: "700", color: BLUE },

  routeFailedChip: {
    position: "absolute",
    top: Platform.OS === "ios" ? 100 : 64,
    alignSelf: "center",
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  routeFailedText: { fontSize: 12, fontWeight: "600", color: "#92400E" },

  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  panel: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },
  statusText: { fontSize: 13, fontWeight: "600", color: "#374151" },

  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  driverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  driverAvatarText: { fontSize: 22, fontWeight: "700", color: GREEN },
  broadcastAvatar: { backgroundColor: "#EFF6FF" },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 17, fontWeight: "700", color: "#111" },
  driverSub: { fontSize: 13, color: "#6B7280", marginTop: 2 },

  infoRow: {
    flexDirection: "row",
    gap: 12,
  },
  infoCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoVal: { fontSize: 17, fontWeight: "800", color: "#111" },
  infoLabel: { fontSize: 11, color: "#6B7280" },

  waitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  waitText: { fontSize: 13, color: "#6B7280" },

  errorText: { fontSize: 13, color: "#EF4444", textAlign: "center" },

  doneBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Rating modal
  ratingModal: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  ratingIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  ratingTitle: { fontSize: 22, fontWeight: "800", color: "#111" },
  ratingSub: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 8,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F59E0B",
  },
  rateBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 8,
    width: "100%",
    alignItems: "center",
  },
  rateBtnDisabled: { backgroundColor: "#D1D5DB" },
  rateBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  skipBtn: { marginTop: 4, paddingVertical: 10 },
  skipText: { fontSize: 14, color: "#9CA3AF", fontWeight: "600" },

  // ── Pending row: countdown + cancel ──────────────────────────
  pendingRow: {
    gap: 10,
  },
  countdownPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    backgroundColor: "#FEF2F2",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EF4444",
  },

  // ── Driver counter-offer banner ───────────────────────────────
  counterBanner: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  counterBannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E3A5F",
  },
  counterBannerFloor: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  counterInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#93C5FD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  counterRPrefix: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  counterInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    paddingVertical: 8,
  },
  counterErrorText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
  },
  counterActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  counterMyBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#93C5FD",
    borderRadius: 12,
    paddingVertical: 11,
  },
  counterMyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E3A5F",
  },
  counterAcceptBtn: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 11,
  },
  counterAcceptText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  counterDismissBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 11,
  },
  counterDismissText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  counterSendBtn: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E3A5F",
    borderRadius: 12,
    paddingVertical: 11,
  },
  counterSendText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
});
