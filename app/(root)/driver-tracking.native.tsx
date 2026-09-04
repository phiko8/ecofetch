import { fetchAPI } from "@/lib/fetch";
import { DRIVER_DARK, DRIVER_LIGHT, useThemeStore } from "@/store";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

const GREEN = "#1AB045";
const BLUE = "#F97316";
const BROADCAST_MS = 5000;
const ROUTE_REFRESH_MS = 45000;

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

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

export default function DriverTracking() {
  const { rideId, userName, originAddress, originLat, originLng, farePrice } =
    useLocalSearchParams();
  const { userId } = useAuth();
  const mapRef = useRef<MapView>(null);
  const isDark = useThemeStore((s) => s.isDark);
  const t = isDark ? DRIVER_DARK : DRIVER_LIGHT;

  const pickupLat = Number(originLat);
  const pickupLng = Number(originLng);
  const hasPickupCoords =
    !isNaN(pickupLat) && !isNaN(pickupLng) && pickupLat !== 0;

  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [eta, setEta] = useState<string | null>(null);
  const [routeFailed, setRouteFailed] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [markerScale, setMarkerScale] = useState(1);

  const driverLocationRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // Fetch real road route from Google Directions API
  const fetchRoute = useCallback(
    async (from: { latitude: number; longitude: number }) => {
      if (!hasPickupCoords) return;
      const apiKey = process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY;
      if (!apiKey) return;
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json` +
            `?origin=${from.latitude},${from.longitude}` +
            `&destination=${pickupLat},${pickupLng}` +
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
    [pickupLat, pickupLng, hasPickupCoords]
  );

  // Watch driver GPS in real-time
  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;

    (async () => {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!canAskAgain) {
          setLocationError("Location access is disabled. Please enable it in Settings.");
          Alert.alert(
            "Location Required",
            "Driver tracking needs location access. Please enable it in your device Settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          setLocationError("Location permission denied");
        }
        return;
      }
      // Broadcast helper — used for both instant and watch updates
      const broadcastPos = (pos: { latitude: number; longitude: number }) => {
        const uid = userIdRef.current;
        if (!uid) return;
        fetchAPI("/(api)/driver-location", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driverClerkId: uid,
            latitude: pos.latitude,
            longitude: pos.longitude,
          }),
        }).catch(() => {});
      };

      // Use last-known position immediately (cached, instant) so the
      // client sees the driver without waiting for a full GPS fix.
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown && !driverLocationRef.current) {
        const pos = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
        driverLocationRef.current = pos;
        setDriverLocation(pos);
        fetchRoute(pos);
        broadcastPos(pos);
      }

      watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 10,
        },
        (loc) => {
          const pos = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          const isFirst = !driverLocationRef.current;
          driverLocationRef.current = pos;
          setDriverLocation(pos);
          if (isFirst) {
            fetchRoute(pos);
            broadcastPos(pos);
          }
        }
      );
    })();

    return () => {
      watcher?.remove();
    };
  }, [fetchRoute]);

  // Re-fetch route every 45 s
  useEffect(() => {
    const interval = setInterval(() => {
      if (driverLocationRef.current) fetchRoute(driverLocationRef.current);
    }, ROUTE_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchRoute]);

  // Broadcast driver location every 5 s
  useEffect(() => {
    if (!userId) return;
    const broadcast = async () => {
      if (!driverLocationRef.current) return;
      try {
        await fetchAPI("/(api)/driver-location", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driverClerkId: userId,
            latitude: driverLocationRef.current.latitude,
            longitude: driverLocationRef.current.longitude,
          }),
        });
      } catch {
        // Location broadcast failed — will retry on next interval
      }
    };
    const interval = setInterval(broadcast, BROADCAST_MS);
    return () => clearInterval(interval);
  }, [userId]);

  // Fit map to show both driver and pickup
  useEffect(() => {
    if (!mapRef.current || !driverLocation || !hasPickupCoords) return;
    mapRef.current.fitToCoordinates(
      [driverLocation, { latitude: pickupLat, longitude: pickupLng }],
      {
        edgePadding: { top: 80, right: 60, bottom: 300, left: 60 },
        animated: true,
      }
    );
  }, [!!driverLocation]);

  const distanceKm =
    driverLocation && hasPickupCoords
      ? haversineKm(
          driverLocation.latitude,
          driverLocation.longitude,
          pickupLat,
          pickupLng
        )
      : null;

  const handleComplete = async () => {
    if (!rideId || !userId) return;
    setCompleting(true);
    try {
      await fetchAPI("/(api)/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId: Number(rideId),
          driverClerkId: userId,
          action: "complete",
        }),
      });
      router.replace("/(root)/(driver-tabs)/dashboard");
    } catch {
      setCompleting(false);
      setCompleteError("Failed to complete the job. Please try again.");
    }
  };

  const initialRegion = hasPickupCoords
    ? {
        latitude: pickupLat,
        longitude: pickupLng,
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
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: t.card }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={20} color={t.text} />
      </TouchableOpacity>

      {/* ETA chip */}
      {eta && (
        <View style={[styles.etaChip, { backgroundColor: t.card }]}>
          <Ionicons name="time-outline" size={14} color={BLUE} />
          <Text style={[styles.etaText, { color: BLUE }]}>{eta} to pickup</Text>
        </View>
      )}

      {/* Route failed chip */}
      {routeFailed && (
        <TouchableOpacity
          style={styles.routeFailedChip}
          onPress={() => {
            if (driverLocationRef.current) {
              setRouteFailed(false);
              fetchRoute(driverLocationRef.current);
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
        showsMyLocationButton={false}
        onRegionChangeComplete={(region: Region) => {
          // Scale markers proportionally with zoom — base delta ~0.04 = scale 1
          const BASE_DELTA = 0.04;
          const scale = Math.max(0.4, Math.min(2.5, BASE_DELTA / region.latitudeDelta));
          setMarkerScale(scale);
        }}
      >
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={BLUE}
            strokeWidth={4}
          />
        )}

        {routeCoords.length === 0 && driverLocation && hasPickupCoords && (
          <Polyline
            coordinates={[
              driverLocation,
              { latitude: pickupLat, longitude: pickupLng },
            ]}
            strokeColor={BLUE}
            strokeWidth={3}
            lineDashPattern={[8, 6]}
          />
        )}

        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            title="You"
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={[styles.driverMarker, { transform: [{ scale: markerScale }] }]}>
              <Ionicons name="car" size={18} color="#fff" />
            </View>
          </Marker>
        )}

        {hasPickupCoords && (
          <Marker
            coordinate={{ latitude: pickupLat, longitude: pickupLng }}
            title={String(userName ?? "Customer")}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <View style={[styles.userMarker, { transform: [{ scale: markerScale }] }]}>
              <Ionicons name="person" size={16} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Bottom panel */}
      <View style={[styles.panel, { backgroundColor: t.card }]}>
        {/* Heading row */}
        <View style={styles.headingRow}>
          <Ionicons name="navigate" size={18} color={BLUE} />
          <Text style={[styles.headingText, { color: BLUE }]}>
            Heading to {String(userName ?? "Customer")}
          </Text>
          {distanceKm != null && (
            <View
              style={[
                styles.distanceBadge,
                { backgroundColor: isDark ? "#1A2942" : "#EFF6FF" },
              ]}
            >
              <Text style={[styles.distanceVal, { color: BLUE }]}>
                {distanceKm < 1
                  ? `${Math.round(distanceKm * 1000)} m`
                  : `${distanceKm.toFixed(1)} km`}
              </Text>
              <Text style={[styles.distanceLabel, { color: t.subText }]}>
                away
              </Text>
            </View>
          )}
        </View>

        {/* Customer info */}
        <View style={styles.userRow}>
          <View
            style={[
              styles.userAvatar,
              { backgroundColor: isDark ? "#1A2942" : "#EFF6FF" },
            ]}
          >
            <Text style={[styles.userAvatarText, { color: BLUE }]}>
              {String(userName ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userNameText, { color: t.text }]}>
              {userName ?? "Customer"}
            </Text>
            <Text style={[styles.addressText, { color: t.subText }]} numberOfLines={2}>
              {originAddress ?? "Pickup location"}
            </Text>
          </View>
        </View>

        {/* Fare */}
        <View style={[styles.fareRow, { backgroundColor: t.fareRowBg }]}>
          <Ionicons name="cash-outline" size={16} color={t.subText} />
          <Text style={[styles.fareLabel, { color: t.subText }]}>
            Estimated fare
          </Text>
          <Text style={[styles.fareAmount, { color: BLUE }]}>
            R {Number(farePrice ?? 0).toFixed(2)}
          </Text>
        </View>

        {!driverLocation && !locationError && (
          <View style={styles.waitRow}>
            <ActivityIndicator size="small" color={BLUE} />
            <Text style={[styles.waitText, { color: t.subText }]}>
              Getting your GPS location…
            </Text>
          </View>
        )}

        {!!locationError && (
          <Text style={styles.errorText}>{locationError}</Text>
        )}

        {completeError ? (
          <Text style={styles.errorText}>{completeError}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.completeBtn, completing && { opacity: 0.6 }]}
          onPress={() => { setCompleteError(""); handleComplete(); }}
          disabled={completing}
          activeOpacity={0.85}
        >
          {completing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="#fff"
              />
              <Text style={styles.completeBtnText}>Mark as Completed</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  map: { flex: 1 },

  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  etaText: { fontSize: 13, fontWeight: "700" },

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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },

  userMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },

  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },

  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headingText: { fontSize: 16, fontWeight: "700", flex: 1 },

  distanceBadge: {
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  distanceVal: { fontSize: 15, fontWeight: "800" },
  distanceLabel: { fontSize: 10 },

  userRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: { fontSize: 20, fontWeight: "700" },
  userInfo: { flex: 1 },
  userNameText: { fontSize: 16, fontWeight: "700" },
  addressText: { fontSize: 13, marginTop: 2, lineHeight: 18 },

  fareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fareLabel: { fontSize: 13, flex: 1 },
  fareAmount: { fontSize: 18, fontWeight: "800" },

  waitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  waitText: { fontSize: 13 },
  errorText: { fontSize: 13, color: "#EF4444", textAlign: "center" },

  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 14,
  },
  completeBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
