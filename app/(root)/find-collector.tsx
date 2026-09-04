import CollectorLayout from "@/components/CollectorLayout";
import CustomButton from "@/components/customButton";
import GoogleTextInput, { RecentPlace } from "@/components/GoogleTextInput";
import { icons } from "@/constants";
import { RECYCLING_COMPANIES, RecyclingCompany } from "@/constants/recyclingCompanies";
import { useBookingStore, useLocationStore } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const GREEN = "#1AB045";

// ── Waste types with official tariff per metric ton ──────────────
const WASTE_TYPES = [
  { label: "Clean Garden Waste", value: "garden", costPerTon: 556.1 },
  { label: "Builders' Rubble, Sand & Soils", value: "rubble", costPerTon: 23.0 },
  { label: "Special Waste", value: "special", costPerTon: 556.1 },
  { label: "Residential Garage Waste", value: "garage", costPerTon: 556.1 },
  { label: "Household Hazardous Waste", value: "hazardous", costPerTon: 737.0 },
];

// ── Pricing constants — used in calculation, NOT shown to client ────
const _FUEL_PRICE_INLAND = 19.35;  // R/L — Diesel 500ppm, Inland
const _FUEL_EFFICIENCY  = 15;      // L/100km — realistic for a bakkie/light truck
const _LABOUR_BASE      = 120;     // R flat base labour charge
const _LABOUR_PER_KM    = 3.50;    // R per km — driver time scales with distance
const _SERVICE_FEE      = 100;     // R flat service & admin fee
const WASTE_MGMT_FEE_RATE = 0.12;  // 12% waste management levy

/** Straight-line distance between two GPS coordinates (km) */
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcFare(
  wasteValue: string,
  weightTons: number,
  distanceKm: number
): number {
  const waste = WASTE_TYPES.find((w) => w.value === wasteValue);
  if (!waste || weightTons <= 0 || distanceKm <= 0) return 0;
  const landfill = waste.costPerTon * weightTons;
  const fuelCost = (distanceKm / 100) * _FUEL_EFFICIENCY * _FUEL_PRICE_INLAND;
  const labour   = _LABOUR_BASE + distanceKm * _LABOUR_PER_KM;
  const base = landfill + fuelCost + labour + _SERVICE_FEE;
  return Math.round((base + base * WASTE_MGMT_FEE_RATE) * 100) / 100;
}

// ── Recyclable material types — collection fee per metric ton ─────
// Fee = what the collector charges to pick up & transport to the recycling company.
// Lower than disposal because recyclables have market value (offset).
// No 12% waste management levy (recycling is incentivised).
const RECYCLE_TYPES = [
  { label: "Paper & Cardboard",            value: "paper",   costPerTon: 175,  icon: "document-outline" },
  { label: "Plastic (PET / HDPE Bottles)", value: "plastic", costPerTon: 240,  icon: "water-outline" },
  { label: "Glass Bottles & Jars",         value: "glass",   costPerTon: 390,  icon: "wine-outline" },
  { label: "Metal Cans (Tin / Aluminium)", value: "metal",   costPerTon: 110,  icon: "cube-outline" },
  { label: "Electronic Waste (E-Waste)",   value: "ewaste",  costPerTon: 820,  icon: "hardware-chip-outline" },
  { label: "Rubber & Tyres",               value: "tyres",   costPerTon: 1050, icon: "ellipse-outline" },
  { label: "Mixed Recyclables",            value: "mixed",   costPerTon: 295,  icon: "layers-outline" },
];

function calcRecycleFare(
  materialValue: string,
  weightTons: number,
  distanceKm: number
): number {
  const material = RECYCLE_TYPES.find((m) => m.value === materialValue);
  if (!material || weightTons <= 0 || distanceKm <= 0) return 0;
  const processingFee = material.costPerTon * weightTons;
  const fuelCost = (distanceKm / 100) * _FUEL_EFFICIENCY * _FUEL_PRICE_INLAND;
  const labour   = _LABOUR_BASE + distanceKm * _LABOUR_PER_KM;
  // No waste management levy for recycling
  return Math.round((processingFee + fuelCost + labour + _SERVICE_FEE) * 100) / 100;
}

// ── Bin cleaning pricing — realistic South African market rates ───
// Base rate per bin: 1-2 bins R120 | 3-5 bins R108 | 6+ bins R95
// Includes: water, cleaning agents, pressure wash, sanitise & deodorise
const _BIN_CLEAN_AGENTS_BASE  = 50;  // R flat — water & cleaning agents
const _BIN_CLEAN_AGENTS_EXTRA = 8;   // R per additional bin
const _BIN_CLEAN_LABOUR_BASE  = 90;  // R flat base labour
const _BIN_CLEAN_LABOUR_EXTRA = 20;  // R per additional bin
const _BIN_CLEAN_SERVICE_FEE  = 80;  // R flat service fee

function calcBinCleaningFare(binCount: number): number {
  if (binCount <= 0) return 0;
  const ratePerBin = binCount >= 6 ? 95 : binCount >= 3 ? 108 : 120;
  const cleanCost  = ratePerBin * binCount;
  const agents     = _BIN_CLEAN_AGENTS_BASE + Math.max(0, binCount - 1) * _BIN_CLEAN_AGENTS_EXTRA;
  const labour     = _BIN_CLEAN_LABOUR_BASE + Math.max(0, binCount - 1) * _BIN_CLEAN_LABOUR_EXTRA;
  return Math.round((cleanCost + agents + labour + _BIN_CLEAN_SERVICE_FEE) * 100) / 100;
}

// ── Floor pricing for negotiation ────────────────────────────────
const FLOOR_RATE          = 0.70;
const FLOOR_MIN_DISPOSE   = 200;
const FLOOR_MIN_RECYCLE   = 150;
const FLOOR_MIN_BIN_CLEAN = 100;
function calcFloorPrice(fare: number, p: string): number {
  const hardMin = p === "bin_cleaning" ? FLOOR_MIN_BIN_CLEAN
    : p === "recycle" ? FLOOR_MIN_RECYCLE : FLOOR_MIN_DISPOSE;
  return Math.max(Math.round(fare * FLOOR_RATE * 100) / 100, hardMin);
}

// ── Screen ───────────────────────────────────────────────────────
const RequestWasteCollection = () => {
  const {
    userAddress,
    destinationAddress,
    userLatitude,
    userLongitude,
    destinationLatitude,
    destinationLongitude,
    setDestinationLocation,
    setUserLocation,
  } = useLocationStore();

  const [recentPickups, setRecentPickups] = useState<RecentPlace[]>([]);

  // ── Purpose toggle (can be pre-selected from home screen) ─────
  const { purpose: purposeParam, extraPurposes: extraPurposesParam } =
    useLocalSearchParams<{ purpose?: string; extraPurposes?: string }>();
  const [purpose, setPurpose] = useState<"dispose" | "recycle" | "bin_cleaning">(
    purposeParam === "recycle" || purposeParam === "bin_cleaning" ? purposeParam : "dispose"
  );

  // Extra services selected alongside this one on the home screen (comma-separated)
  const extraServices = (extraPurposesParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Load saved recent pickup addresses on mount
  useEffect(() => {
    SecureStore.getItemAsync("eco_recent_pickups").then((raw) => {
      if (raw) {
        try { setRecentPickups(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const savePickupAddress = async (place: RecentPlace) => {
    const filtered = recentPickups.filter((p) => p.description !== place.description);
    const updated = [place, ...filtered].slice(0, 5); // keep latest 5
    setRecentPickups(updated);
    await SecureStore.setItemAsync("eco_recent_pickups", JSON.stringify(updated));
  };

  // Waste site state
  type WasteSite = {
    id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    city: string;
    distance_km: number;
  };
  const [nearbySites, setNearbySites] = useState<WasteSite[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [sitePickerOpen, setSitePickerOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [useManualSearch, setUseManualSearch] = useState(false);

  // Recycling companies — sorted by distance from static bundled data (no server call)
  type RecyclingCompanyWithDist = RecyclingCompany & { distance_km: number };
  const [nearbyRecyclers, setNearbyRecyclers] = useState<RecyclingCompanyWithDist[]>([]);
  const [recyclerPickerOpen, setRecyclerPickerOpen] = useState(false);
  const [selectedRecyclerId, setSelectedRecyclerId] = useState<number | null>(null);

  const [wasteType, setWasteType] = useState("garden");
  const [recycleType, setRecycleType] = useState("mixed");
  const [weight, setWeight] = useState("");
  const [bins, setBins] = useState("");
  // Extra bin cleaning add-on (when combined dispose/recycle + bin_cleaning selected)
  const [extraBins, setExtraBins] = useState("1");
  const [weightMode, setWeightMode] = useState<"tons" | "bins">("bins");
  const [offeredPrice, setOfferedPrice] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recyclePickerOpen, setRecyclePickerOpen] = useState(false);

  const wastePhoto = useBookingStore((s) => s.wastePhoto);
  const setWastePhoto = useBookingStore((s) => s.setWastePhoto);

  // Auto-fetch nearest government waste sites when location is ready
  useEffect(() => {
    if (!userLatitude || !userLongitude) return;
    setLoadingSites(true);
    (async () => {
      try {
        const BASE = __DEV__
          ? ""
          : (process.env.EXPO_PUBLIC_SERVER_URL ?? "").replace(/\/$/, "");
        const url = `${BASE}/(api)/waste-sites?lat=${userLatitude}&lng=${userLongitude}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          setNearbySites(json.data);
          if (selectedSiteId === null && purpose === "dispose") {
            const nearest: WasteSite = json.data[0];
            setSelectedSiteId(nearest.id);
            setDestinationLocation({
              latitude: Number(nearest.latitude),
              longitude: Number(nearest.longitude),
              address: nearest.name,
            });
          }
        }
      } catch {
        // silently skip — user can tap to search manually
      } finally {
        setLoadingSites(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLatitude, userLongitude]);

  // Sort recycling companies by distance using bundled static data — no server call
  useEffect(() => {
    if (!userLatitude || !userLongitude) return;
    const sorted = RECYCLING_COMPANIES
      .map((c) => ({
        ...c,
        distance_km: Math.round(
          haversineKm(userLatitude, userLongitude, c.latitude, c.longitude) * 10
        ) / 10,
      }))
      .filter((c) => c.distance_km <= 500) // include all within 500 km
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, 10);
    setNearbyRecyclers(sorted);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLatitude, userLongitude]);

  // When purpose switches, swap the destination to the nearest facility of that type
  useEffect(() => {
    if (purpose === "dispose" && nearbySites.length > 0) {
      const site = nearbySites.find((s) => s.id === selectedSiteId) ?? nearbySites[0];
      if (!selectedSiteId) setSelectedSiteId(site.id);
      setDestinationLocation({
        latitude: Number(site.latitude),
        longitude: Number(site.longitude),
        address: site.name,
      });
    } else if (purpose === "recycle" && nearbyRecyclers.length > 0) {
      const rec = nearbyRecyclers.find((r) => r.id === selectedRecyclerId) ?? nearbyRecyclers[0];
      setSelectedRecyclerId(rec.id);
      setDestinationLocation({
        latitude: Number(rec.latitude),
        longitude: Number(rec.longitude),
        address: rec.name,
      });
    }
    // bin_cleaning: no facility needed — service happens at pickup location
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purpose]);

  // Auto-select nearest recycler once the list loads (handles the race where
  // the user has already switched to "recycle" before fetch completed)
  useEffect(() => {
    if (purpose === "recycle" && nearbyRecyclers.length > 0 && selectedRecyclerId === null) {
      const first = nearbyRecyclers[0];
      setSelectedRecyclerId(first.id);
      setDestinationLocation({
        latitude: Number(first.latitude),
        longitude: Number(first.longitude),
        address: first.name,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearbyRecyclers]);

  const handleSelectSite = (site: WasteSite) => {
    setSelectedSiteId(site.id);
    setUseManualSearch(false);
    setDestinationLocation({
      latitude: Number(site.latitude),
      longitude: Number(site.longitude),
      address: site.name,
    });
    setSitePickerOpen(false);
  };

  const handleSelectRecycler = (rec: RecyclingCompany) => {
    setSelectedRecyclerId(rec.id);
    setDestinationLocation({
      latitude: Number(rec.latitude),
      longitude: Number(rec.longitude),
      address: rec.name,
    });
    setRecyclerPickerOpen(false);
  };

  // 1 standard 240 L wheelie bin ≈ 0.07 metric tons when full
  const TONS_PER_BIN = 0.07;

  const weightNum =
    weightMode === "bins"
      ? (parseInt(bins, 10) || 0) * TONS_PER_BIN
      : parseFloat(weight);

  // Auto-calculate distance from map coordinates
  const autoDistance =
    userLatitude && userLongitude && destinationLatitude && destinationLongitude
      ? haversineKm(userLatitude, userLongitude, destinationLatitude, destinationLongitude)
      : 0;

  const MAX_BINS = 50;
  const MAX_TONS = 20;

  const weightInputError =
    weightMode === "bins" && parseInt(bins, 10) > MAX_BINS
      ? `Maximum ${MAX_BINS} bins per booking`
      : weightMode === "tons" && parseFloat(weight) > MAX_TONS
      ? `Maximum ${MAX_TONS} metric tons per booking`
      : weightMode === "tons" && parseFloat(weight) < 0
      ? "Weight cannot be negative"
      : null;

  const hasPickup = !!userAddress;
  const hasFacility = !!destinationAddress && autoDistance > 0;
  const hasWeight = purpose === "bin_cleaning"
    ? parseInt(bins, 10) > 0
    : !isNaN(weightNum) && weightNum > 0 && !weightInputError;
  const weightDisplay =
    weightMode === "bins"
      ? bins
      : weight;

  // ── Extra bin cleaning add-on (derived before canProceed) ─────
  const showExtraBinCleaning = extraServices.includes("bin_cleaning") && purpose !== "bin_cleaning";
  const extraBinCount = showExtraBinCleaning ? (parseInt(extraBins, 10) || 0) : 0;

  const canProceed = hasPickup
    && (purpose === "bin_cleaning" || hasFacility)
    && hasWeight
    && (!showExtraBinCleaning || extraBinCount > 0);

  const selectedRecycleMaterial = RECYCLE_TYPES.find((m) => m.value === recycleType)!;
  const selectedWaste = WASTE_TYPES.find((w) => w.value === wasteType)!;

  const estimatedFare = canProceed
    ? purpose === "recycle"
      ? calcRecycleFare(recycleType, weightNum, autoDistance)
      : purpose === "bin_cleaning"
      ? calcBinCleaningFare(parseInt(bins, 10) || 0)
      : calcFare(wasteType, weightNum, autoDistance)
    : 0;

  const extraBinFare  = showExtraBinCleaning && extraBinCount > 0
    ? calcBinCleaningFare(extraBinCount)
    : 0;
  const combinedFare  = estimatedFare + extraBinFare;

  // ── Offer negotiation ──────────────────────────────────────────
  const floorPrice   = combinedFare > 0 ? calcFloorPrice(combinedFare, purpose) : 0;
  const offeredNum   = parseFloat(offeredPrice) || 0;
  const offerTouched = offeredPrice !== "";
  const offerValid   = !offerTouched || offeredNum >= floorPrice;

  // Reset offer when fare changes (different weight/distance)
  useEffect(() => {
    setOfferedPrice("");
  }, [estimatedFare]);

  const handleAddPhoto = () => {
    Alert.alert("Waste Photo", "Choose a source", [
      {
        text: "Take Photo",
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert("Permission needed", "Camera access is required to take a photo.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
            base64: true,
            allowsEditing: true,
            aspect: [4, 3],
          });
          if (!result.canceled && result.assets[0].base64) {
            setWastePhoto("data:image/jpeg;base64," + result.assets[0].base64);
          }
        },
      },
      {
        text: "Choose from Gallery",
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert("Permission needed", "Gallery access is required.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
            base64: true,
            allowsEditing: true,
            aspect: [4, 3],
          });
          if (!result.canceled && result.assets[0].base64) {
            setWastePhoto("data:image/jpeg;base64," + result.assets[0].base64);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <CollectorLayout
      title={
        <Text style={styles.headerTitle}>
          {purpose === "bin_cleaning"
            ? "Request Bin Cleaning"
            : purpose === "recycle"
            ? "Request Recycling Collection"
            : "Request Waste Collection"}
        </Text>
      }
      snapPoints={["75%", "95%"]}
      searchOverlay={
        <GoogleTextInput
          icon={icons.target}
          initialLocation={userAddress!}
          containerStyle={{ backgroundColor: "#fff", borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 6 }}
          textInputBackgroundColor="#fff"
          recentPlaces={recentPickups}
          handlePress={(location) => {
            setUserLocation(location);
            savePickupAddress({
              description: location.address,
              latitude: location.latitude,
              longitude: location.longitude,
            });
          }}
        />
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        indicatorStyle="black"
        persistentScrollbar={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Service type toggle: Dispose / Recycle / Clean Bins ─ */}
        <View style={styles.purposeToggleRow}>
          <TouchableOpacity
            style={[styles.purposeBtn, purpose === "dispose" && styles.purposeBtnActiveDispose]}
            onPress={() => setPurpose("dispose")}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={14} color={purpose === "dispose" ? "#fff" : "#6B7280"} />
            <Text style={[styles.purposeBtnText, purpose === "dispose" && styles.purposeBtnTextActive]}>
              Dispose
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.purposeBtn, purpose === "recycle" && styles.purposeBtnActiveRecycle]}
            onPress={() => setPurpose("recycle")}
            activeOpacity={0.8}
          >
            <Ionicons name="leaf-outline" size={14} color={purpose === "recycle" ? "#fff" : "#6B7280"} />
            <Text style={[styles.purposeBtnText, purpose === "recycle" && styles.purposeBtnTextActive]}>
              Recycle
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.purposeBtn, purpose === "bin_cleaning" && styles.purposeBtnActiveBinClean]}
            onPress={() => setPurpose("bin_cleaning")}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles-outline" size={14} color={purpose === "bin_cleaning" ? "#fff" : "#6B7280"} />
            <Text style={[styles.purposeBtnText, purpose === "bin_cleaning" && styles.purposeBtnTextActive]}>
              Clean Bins
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Bin cleaning info banner ─────────────────────────── */}
        {purpose === "bin_cleaning" && (
          <View style={styles.binCleanBanner}>
            <Ionicons name="sparkles" size={16} color="#0284C7" />
            <Text style={styles.binCleanBannerText}>
              A collector visits your location to pressure-wash and sanitise your bins. Includes water, cleaning agents & labour.
            </Text>
          </View>
        )}

        {/* ── Extra services banner ────────────────────────────── */}
        {extraServices.length > 0 && (
          <View style={styles.extraServicesBanner}>
            <Ionicons name="add-circle-outline" size={16} color={GREEN} />
            <Text style={styles.extraServicesBannerText}>
              Also booking:{" "}
              {extraServices.map((s) =>
                s === "bin_cleaning" ? "Bin Cleaning" : s === "recycle" ? "Recycling" : "Waste Disposal"
              ).join(" & ")}
            </Text>
          </View>
        )}

        {/* ── Dispose mode: government waste facilities ─────────── */}
        {purpose === "dispose" && (
          <>
        {/* Waste facility — auto-selected from nearest government sites */}
        <View style={[styles.labelRow, { marginTop: 0 }]}>
          <Text style={styles.label}>Waste Facility</Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredText}>needed for fee</Text>
          </View>
        </View>

        {loadingSites ? (
          <View style={styles.sitesLoadingRow}>
            <ActivityIndicator size="small" color={GREEN} />
            <Text style={styles.sitesLoadingText}>Finding nearby sites…</Text>
          </View>
        ) : selectedSiteId !== null ? (
          <>
            {(() => {
              const site = nearbySites.find((s) => s.id === selectedSiteId);
              return (
                <TouchableOpacity
                  style={styles.selectorBtn}
                  onPress={() => setSitePickerOpen(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.selectorLeft}>
                    <Ionicons name="location-outline" size={18} color={GREEN} />
                    <Text style={styles.selectorText} numberOfLines={1}>
                      {site?.name ?? destinationAddress ?? "Selected site"}
                    </Text>
                    {site?.distance_km !== undefined && (
                      <View style={styles.distanceBadge}>
                        <Text style={styles.distanceBadgeText}>
                          {site.distance_km} km
                        </Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-down" size={18} color="#6B7280" />
                </TouchableOpacity>
              );
            })()}
          </>
        ) : (
          <TouchableOpacity
            style={[styles.selectorBtn, { borderWidth: 1, borderColor: "#E5E7EB", borderStyle: "dashed" }]}
            onPress={() => setSitePickerOpen(true)}
            activeOpacity={0.8}
          >
            <View style={styles.selectorLeft}>
              <Ionicons name="location-outline" size={18} color="#9CA3AF" />
              <Text style={[styles.selectorText, { color: "#9CA3AF" }]}>
                Tap to select a waste facility…
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        {useManualSearch && (
          <View style={{ marginTop: 10 }}>
            <GoogleTextInput
              icon={icons.map}
              initialLocation={destinationAddress!}
              placeholder="Search waste drop-off or recycling centre…"
              containerStyle={{ backgroundColor: "#f5f5f5" }}
              textInputBackgroundColor="transparent"
              handlePress={(location) => {
                setDestinationLocation(location);
                setSelectedSiteId(null);
              }}
              locationBias={
                userLatitude && userLongitude
                  ? { lat: userLatitude, lng: userLongitude }
                  : undefined
              }
              queryExtras={{
                keyword: "waste drop off recycling centre landfill",
                types: "establishment",
              }}
            />
          </View>
        )}

        {/* Auto-calculated distance */}
        {hasFacility && (
          <View style={styles.distanceRow}>
            <Ionicons name="navigate-outline" size={14} color={GREEN} />
            <Text style={styles.distanceText}>
              Distance calculated from map:{" "}
              <Text style={styles.distanceBold}>
                {autoDistance.toFixed(1)} km
              </Text>
            </Text>
          </View>
        )}

        {!hasFacility && hasPickup && purpose === "dispose" && (
          <View style={styles.distanceHint}>
            <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
            <Text style={styles.distanceHintText}>
              Select a waste facility to auto-calculate distance
            </Text>
          </View>
        )}
          </>
        )}

        {/* ── Recycle mode: nearby recycling companies ──────────── */}
        {purpose === "recycle" && (
          <>
            <View style={[styles.labelRow, { marginTop: 0 }]}>
              <Text style={styles.label}>Recycling Company</Text>
              <View style={[styles.requiredBadge, { backgroundColor: "#DCFCE7" }]}>
                <Text style={[styles.requiredText, { color: "#166534" }]}>needed for fee</Text>
              </View>
            </View>

            {selectedRecyclerId !== null ? (
              <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() => setRecyclerPickerOpen(true)}
                activeOpacity={0.8}
              >
                {(() => {
                  const rec = nearbyRecyclers.find((r) => r.id === selectedRecyclerId);
                  return (
                    <View style={styles.selectorLeft}>
                      <Ionicons name="leaf-outline" size={18} color={GREEN} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectorText} numberOfLines={1}>
                          {rec?.name ?? destinationAddress ?? "Selected recycler"}
                        </Text>
                        {rec?.materials_accepted ? (
                          <Text style={styles.recyclerMaterials} numberOfLines={1}>
                            {rec.materials_accepted}
                          </Text>
                        ) : null}
                      </View>
                      {rec?.distance_km !== undefined && (
                        <View style={styles.distanceBadge}>
                          <Text style={styles.distanceBadgeText}>{rec.distance_km} km</Text>
                        </View>
                      )}
                    </View>
                  );
                })()}
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.selectorBtn, { borderWidth: 1, borderColor: "#E5E7EB", borderStyle: "dashed" }]}
                onPress={() => setRecyclerPickerOpen(true)}
                activeOpacity={0.8}
              >
                <View style={styles.selectorLeft}>
                  <Ionicons name="leaf-outline" size={18} color="#9CA3AF" />
                  <Text style={[styles.selectorText, { color: "#9CA3AF" }]}>
                    Tap to select a recycling company…
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}

            {hasFacility && (
              <View style={styles.distanceRow}>
                <Ionicons name="navigate-outline" size={14} color={GREEN} />
                <Text style={styles.distanceText}>
                  Distance calculated from map:{" "}
                  <Text style={styles.distanceBold}>{autoDistance.toFixed(1)} km</Text>
                </Text>
              </View>
            )}

            {!hasFacility && hasPickup && (
              <View style={styles.distanceHint}>
                <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
                <Text style={styles.distanceHintText}>
                  Select a recycling company to auto-calculate distance
                </Text>
              </View>
            )}
          </>
        )}

        {/* Type selector — only for dispose and recycle */}
        {purpose !== "bin_cleaning" && (
          <>
            <Text style={[styles.label, { marginTop: 18 }]}>
              {purpose === "recycle" ? "Type of Recyclable Material" : "Type of Waste"}
            </Text>
            <TouchableOpacity
              style={styles.selectorBtn}
              onPress={() => purpose === "recycle" ? setRecyclePickerOpen(true) : setPickerOpen(true)}
              activeOpacity={0.8}
            >
              <View style={styles.selectorLeft}>
                <Ionicons
                  name={purpose === "recycle" ? (selectedRecycleMaterial.icon as any) : "trash-outline"}
                  size={18}
                  color={GREEN}
                />
                <Text style={styles.selectorText} numberOfLines={1}>
                  {purpose === "recycle" ? selectedRecycleMaterial.label : selectedWaste.label}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#6B7280" />
            </TouchableOpacity>
          </>
        )}

        {/* Weight — toggle between bins and tons (always bins for bin cleaning) */}
        <View style={styles.weightHeaderRow}>
          <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>
            {purpose === "bin_cleaning"
              ? "Number of Bins to Clean"
              : weightMode === "bins" ? "Number of Bins" : "Weight (metric tons)"}
          </Text>
          {purpose !== "bin_cleaning" && (
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, weightMode === "bins" && styles.modeBtnActive]}
                onPress={() => setWeightMode("bins")}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-bin-outline" size={14} color={weightMode === "bins" ? "#fff" : "#6B7280"} />
                <Text style={[styles.modeBtnText, weightMode === "bins" && styles.modeBtnTextActive]}>
                  Bins
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, weightMode === "tons" && styles.modeBtnActive]}
                onPress={() => setWeightMode("tons")}
                activeOpacity={0.8}
              >
                <Ionicons name="scale-outline" size={14} color={weightMode === "tons" ? "#fff" : "#6B7280"} />
                <Text style={[styles.modeBtnText, weightMode === "tons" && styles.modeBtnTextActive]}>
                  Tons
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {(purpose === "bin_cleaning" || weightMode === "bins") ? (
          <>
            <View style={styles.inputWrap}>
              <Ionicons
                name={purpose === "bin_cleaning" ? "sparkles-outline" : "trash-bin-outline"}
                size={18}
                color={purpose === "bin_cleaning" ? "#0284C7" : GREEN}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g. 3"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={bins}
                onChangeText={(t) => setBins(t.replace(/[^0-9]/g, ""))}
              />
              <Text style={styles.inputUnit}>
                {parseInt(bins, 10) === 1 ? "bin" : "bins"}
              </Text>
            </View>
            {parseInt(bins, 10) > 0 && !weightInputError && (
              <View style={styles.conversionHint}>
                <Ionicons name="information-circle-outline" size={13} color="#6B7280" />
                {purpose === "bin_cleaning" ? (
                  <Text style={styles.conversionText}>
                    Rate:{" "}
                    <Text style={{ color: "#0284C7", fontWeight: "700" }}>
                      R{parseInt(bins, 10) >= 6 ? "95" : parseInt(bins, 10) >= 3 ? "108" : "120"}/bin
                    </Text>
                    {parseInt(bins, 10) >= 3 && (
                      <Text style={styles.conversionSub}> · volume discount applied</Text>
                    )}
                  </Text>
                ) : (
                  <Text style={styles.conversionText}>
                    ≈ {(parseInt(bins, 10) * TONS_PER_BIN).toFixed(2)} metric tons
                    <Text style={styles.conversionSub}> (based on 240 L bin)</Text>
                  </Text>
                )}
              </View>
            )}
          </>
        ) : (
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1.5"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
            />
            <Text style={styles.inputUnit}>metric ton</Text>
          </View>
        )}

        {weightInputError && (
          <View style={styles.inputErrorRow}>
            <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
            <Text style={styles.inputErrorText}>{weightInputError}</Text>
          </View>
        )}

        {/* Estimated fee card */}
        {canProceed ? (
          <View style={[styles.fareCard, purpose === "bin_cleaning" && styles.fareCardBinClean]}>
            <View style={styles.fareCardTopRow}>
              <Ionicons
                name={purpose === "bin_cleaning" ? "sparkles-outline" : "navigate-circle-outline"}
                size={14}
                color="#6B7280"
              />
              <Text style={styles.fareCardDistance}>
                {purpose === "bin_cleaning"
                  ? `${bins} ${parseInt(bins, 10) === 1 ? "bin" : "bins"} · Bin Cleaning Service`
                  : `${autoDistance.toFixed(1)} km · ${purpose === "recycle" ? selectedRecycleMaterial.label : selectedWaste.label}`}
              </Text>
            </View>
            <View style={styles.fareCardDivider} />
            <Text style={styles.fareCardLabel}>
              {purpose === "bin_cleaning"
                ? "Estimated Bin Cleaning Fee"
                : purpose === "recycle" ? "Estimated Recycling Collection Fee" : "Estimated Collection Fee"}
            </Text>
            <Text style={[styles.fareCardAmount, purpose === "bin_cleaning" && { color: "#0284C7" }]}>
              R {estimatedFare.toFixed(2)}
            </Text>
            <Text style={styles.fareCardNote}>
              {purpose === "bin_cleaning"
                ? "Includes water, cleaning agents, pressure wash, labour & service fee"
                : purpose === "recycle"
                ? "Includes recycling facility fee, fuel, labour & service fee"
                : "Includes landfill fees, labour, service & waste management fee"}
            </Text>

            {/* Extra bin cleaning breakdown */}
            {showExtraBinCleaning && extraBinFare > 0 && (
              <>
                <View style={styles.fareCardDivider} />
                <View style={styles.fareAddOnRow}>
                  <Ionicons name="sparkles-outline" size={13} color="#0284C7" />
                  <Text style={styles.fareAddOnLabel}>
                    Bin Cleaning ({extraBinCount} {extraBinCount === 1 ? "bin" : "bins"})
                  </Text>
                  <Text style={styles.fareAddOnAmount}>R {extraBinFare.toFixed(2)}</Text>
                </View>
                <View style={styles.fareCardDivider} />
                <Text style={styles.fareCardLabel}>Combined Total</Text>
                <Text style={[styles.fareCardAmount, { color: GREEN }]}>
                  R {combinedFare.toFixed(2)}
                </Text>
              </>
            )}
          </View>
        ) : (
          <View style={styles.fareHintCard}>
            <Ionicons name="receipt-outline" size={20} color="#D1D5DB" />
            <Text style={styles.fareHintCardText}>
              {!hasPickup
                ? "Set your pickup address above"
                : !hasFacility && purpose !== "bin_cleaning"
                ? purpose === "recycle"
                  ? "Select a recycling company to calculate fee"
                  : "Select a waste facility to calculate fee"
                : `Enter number of bins to calculate fee`}
            </Text>
          </View>
        )}

        {/* ── Extra bin cleaning add-on input ──────────────────── */}
        {showExtraBinCleaning && (
          <View style={styles.extraBinSection}>
            <View style={styles.extraBinHeader}>
              <Ionicons name="sparkles" size={15} color="#0284C7" />
              <Text style={styles.extraBinTitle}>Bin Cleaning Add-on</Text>
            </View>
            <Text style={styles.extraBinSub}>How many bins do you want cleaned at your location?</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="sparkles-outline" size={18} color="#0284C7" />
              <TextInput
                style={styles.input}
                placeholder="e.g. 2"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={extraBins}
                onChangeText={(t) => setExtraBins(t.replace(/[^0-9]/g, ""))}
              />
              <Text style={styles.inputUnit}>{extraBinCount === 1 ? "bin" : "bins"}</Text>
            </View>
            {extraBinCount > 0 && (
              <View style={styles.conversionHint}>
                <Ionicons name="information-circle-outline" size={13} color="#0284C7" />
                <Text style={[styles.conversionText, { color: "#0369A1" }]}>
                  Rate:{" "}
                  <Text style={{ color: "#0284C7", fontWeight: "700" }}>
                    R{extraBinCount >= 6 ? "95" : extraBinCount >= 3 ? "108" : "120"}/bin
                  </Text>
                  {extraBinCount >= 3 && (
                    <Text style={styles.conversionSub}> · volume discount applied</Text>
                  )}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Starting offer input ─────────────────────────────── */}
        {canProceed && (
          <View style={styles.offerCard}>
            <View style={styles.offerCardHeader}>
              <Ionicons name="pricetag-outline" size={16} color={GREEN} />
              <Text style={styles.offerCardTitle}>Set Your Starting Offer</Text>
            </View>
            <Text style={styles.offerCardHint}>
              Offer less to attract drivers. They can accept, counter, or negotiate with you in real time.
            </Text>
            <View style={styles.offerMetaRow}>
              <View style={styles.offerMetaPill}>
                <Text style={styles.offerMetaLabel}>Suggested</Text>
                <Text style={styles.offerMetaValue}>R {combinedFare.toFixed(2)}</Text>
              </View>
              <View style={[styles.offerMetaPill, styles.offerMetaFloorPill]}>
                <Text style={styles.offerMetaLabel}>Minimum</Text>
                <Text style={[styles.offerMetaValue, { color: "#EF4444" }]}>R {floorPrice.toFixed(2)}</Text>
              </View>
            </View>
            <View style={[styles.offerInputRow, offerTouched && !offerValid && styles.offerInputRowError]}>
              <Text style={styles.offerRPrefix}>R</Text>
              <TextInput
                style={styles.offerInput}
                value={offeredPrice}
                onChangeText={setOfferedPrice}
                keyboardType="decimal-pad"
                placeholder={estimatedFare.toFixed(2)}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            {offerTouched && !offerValid && (
              <Text style={styles.offerErrorText}>Minimum offer: R {floorPrice.toFixed(2)}</Text>
            )}
          </View>
        )}

        {/* Waste Photo */}
        <TouchableOpacity
          style={[styles.photoCard, wastePhoto && styles.photoCardActive]}
          onPress={handleAddPhoto}
          activeOpacity={0.82}
        >
          {wastePhoto ? (
            <View style={styles.photoPreviewWrapper}>
              <Image source={{ uri: wastePhoto }} style={styles.photoPreview} resizeMode="cover" />
              <View style={styles.photoOverlay}>
                <Ionicons name="camera-outline" size={18} color="#fff" />
                <Text style={styles.photoOverlayText}>Tap to change photo</Text>
              </View>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <View style={styles.photoIconCircle}>
                <Ionicons name="camera-outline" size={22} color={GREEN} />
              </View>
              <View style={styles.photoTextBlock}>
                <Text style={styles.photoTitle}>Add Waste Photo <Text style={styles.photoOptional}>(optional)</Text></Text>
                <Text style={styles.photoSub}>Helps the collector prepare the right tools</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </View>
          )}
        </TouchableOpacity>

        <CustomButton
          title={purpose === "bin_cleaning" ? "Request Bin Cleaner" : "Request Collector"}
          onPress={() =>
            router.push({
              pathname: "/(root)/confirm-collector",
              params: {
                calculatedFare: String(combinedFare),
                offeredPrice: String(
                  offerTouched && offerValid ? offeredNum.toFixed(2) : combinedFare.toFixed(2)
                ),
                wasteLabel: purpose === "bin_cleaning"
                  ? `Bin Cleaning (${bins} ${parseInt(bins, 10) === 1 ? "bin" : "bins"})`
                  : showExtraBinCleaning && extraBinCount > 0
                  ? `${purpose === "recycle" ? selectedRecycleMaterial.label : selectedWaste.label} + Bin Cleaning (${extraBinCount} ${extraBinCount === 1 ? "bin" : "bins"})`
                  : purpose === "recycle" ? selectedRecycleMaterial.label : selectedWaste.label,
                wasteType: purpose === "bin_cleaning" ? "bin_cleaning"
                  : purpose === "recycle" ? recycleType : wasteType,
                weightTons: purpose === "bin_cleaning" ? "0" : String(weightNum.toFixed(3)),
                binsCount: (purpose === "bin_cleaning" || weightMode === "bins") ? bins : "",
                purpose,
                extraPurposes: extraPurposesParam ?? "",
                extra_bins_count: showExtraBinCleaning ? extraBins : "",
              },
            })
          }
          disabled={!canProceed || (offerTouched && !offerValid)}
          customStyle={[styles.btn, !canProceed && { opacity: 0.45 }]}
        />
      </ScrollView>

      {/* Waste site picker modal */}
      <Modal
        visible={sitePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSitePickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSitePickerOpen(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Nearby Waste Facilities</Text>
            {nearbySites.map((site) => (
              <TouchableOpacity
                key={site.id}
                style={[
                  styles.modalOption,
                  selectedSiteId === site.id && styles.modalOptionActive,
                ]}
                onPress={() => handleSelectSite(site)}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedSiteId === site.id && styles.modalOptionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {site.name}
                  </Text>
                  {site.city ? (
                    <Text style={styles.siteSubText}>{site.city}</Text>
                  ) : null}
                </View>
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceBadgeText}>{site.distance_km} km</Text>
                </View>
                {selectedSiteId === site.id && (
                  <Ionicons name="checkmark" size={18} color={GREEN} style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.manualSearchBtn}
              onPress={() => {
                setUseManualSearch(true);
                setSitePickerOpen(false);
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="search-outline" size={16} color="#6B7280" />
              <Text style={styles.manualSearchText}>Search manually instead</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Recycling company picker modal */}
      <Modal
        visible={recyclerPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRecyclerPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRecyclerPickerOpen(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Nearby Recycling Companies</Text>
            {nearbyRecyclers.map((rec) => (
              <TouchableOpacity
                key={rec.id}
                style={[
                  styles.modalOption,
                  selectedRecyclerId === rec.id && styles.modalOptionActive,
                ]}
                onPress={() => handleSelectRecycler(rec)}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedRecyclerId === rec.id && styles.modalOptionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {rec.name}
                  </Text>
                  {rec.city ? (
                    <Text style={styles.siteSubText}>{rec.city} · {rec.materials_accepted}</Text>
                  ) : null}
                </View>
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceBadgeText}>{rec.distance_km} km</Text>
                </View>
                {selectedRecyclerId === rec.id && (
                  <Ionicons name="checkmark" size={18} color={GREEN} style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            ))}
            {nearbyRecyclers.length === 0 && (
              <View style={styles.noResultsRow}>
                <Ionicons name="leaf-outline" size={20} color="#D1D5DB" />
                <Text style={styles.noResultsText}>No recycling companies found nearby</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Recyclable material picker modal */}
      <Modal
        visible={recyclePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRecyclePickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRecyclePickerOpen(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Recyclable Material</Text>
            {RECYCLE_TYPES.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.modalOption,
                  recycleType === opt.value && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setRecycleType(opt.value);
                  setRecyclePickerOpen(false);
                }}
                activeOpacity={0.75}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <Ionicons name={opt.icon as any} size={18} color={recycleType === opt.value ? GREEN : "#6B7280"} />
                  <Text
                    style={[
                      styles.modalOptionText,
                      recycleType === opt.value && styles.modalOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </View>
                {recycleType === opt.value && (
                  <Ionicons name="checkmark" size={18} color={GREEN} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Waste type picker modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerOpen(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Waste Type</Text>
            {WASTE_TYPES.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.modalOption,
                  wasteType === opt.value && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setWasteType(opt.value);
                  setPickerOpen(false);
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    wasteType === opt.value && styles.modalOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {wasteType === opt.value && (
                  <Ionicons name="checkmark" size={18} color={GREEN} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </CollectorLayout>
  );
};

export default RequestWasteCollection;

const styles = StyleSheet.create({
  headerTitle: { color: "#000", fontSize: 17, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 50 },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 18,
  },
  requiredBadge: {
    backgroundColor: "#FEF9C3",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  requiredText: { fontSize: 11, color: "#854D0E", fontWeight: "600" },

  // Distance
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  distanceText: { fontSize: 12, color: "#166534" },
  distanceBold: { fontWeight: "700" },
  distanceHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  distanceHintText: { fontSize: 12, color: "#9CA3AF" },

  // Selector
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  selectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  selectorText: { fontSize: 14, color: "#111", flex: 1 },

  // Weight section header
  weightHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 8,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  modeBtnActive: { backgroundColor: GREEN },
  modeBtnText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  modeBtnTextActive: { color: "#fff" },

  // Bins conversion hint
  conversionHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  conversionText: { fontSize: 12, color: "#6B7280" },
  conversionSub: { fontSize: 11, color: "#9CA3AF" },
  inputErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
    paddingHorizontal: 2,
  },
  inputErrorText: { fontSize: 12, color: "#EF4444" },

  // Weight input
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  input: { flex: 1, fontSize: 14, color: "#111" },
  inputUnit: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },

  // Fare card — stacked layout, no overlap
  fareCard: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  fareCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  fareCardDistance: { fontSize: 12, color: "#6B7280", flex: 1 },
  fareCardDivider: { height: 1, backgroundColor: "#E5E7EB", marginBottom: 12 },
  fareCardLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 4,
  },
  fareCardAmount: {
    fontSize: 28,
    color: GREEN,
    marginBottom: 8,
  },
  fareCardNote: {
    fontSize: 11,
    color: "#9CA3AF",
    lineHeight: 16,
  },

  // Fare hint placeholder
  fareHintCard: {
    marginTop: 20,
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
  },
  fareHintCardText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },

  btn: { marginTop: 16 },

  // Waste photo
  photoCard: {
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  photoCardActive: { borderColor: GREEN },
  photoPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  photoIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#F0FDF4",
    alignItems: "center", justifyContent: "center",
  },
  photoTextBlock: { flex: 1 },
  photoTitle: { fontSize: 14, fontWeight: "700", color: "#111" },
  photoOptional: { fontSize: 12, fontWeight: "400", color: "#9CA3AF" },
  photoSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  photoPreviewWrapper: { position: "relative" },
  photoPreview: { width: "100%", height: 170 },
  photoOverlay: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  photoOverlayText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  // Site loading
  sitesLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  sitesLoadingText: { fontSize: 14, color: "#9CA3AF" },

  // Distance badge (inline)
  distanceBadge: {
    backgroundColor: "#F0FDF4",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 6,
  },
  distanceBadgeText: { fontSize: 11, color: "#166534", fontWeight: "600" },

  // Site sub-text
  siteSubText: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },

  // Manual search button at bottom of site picker
  manualSearchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  manualSearchText: { fontSize: 14, color: "#6B7280" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 14,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 14,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalOptionActive: {
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginHorizontal: -10,
  },
  modalOptionText: { fontSize: 14, color: "#111", flex: 1 },
  modalOptionTextActive: { color: GREEN, fontWeight: "700" },

  // Purpose toggle — compact 3-button segmented control
  purposeToggleRow: {
    flexDirection: "row",
    gap: 3,
    marginBottom: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 3,
  },
  purposeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 9,
  },
  purposeBtnActiveDispose: {
    backgroundColor: "#374151",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  purposeBtnActiveRecycle: {
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  purposeBtnActiveBinClean: {
    backgroundColor: "#0284C7",
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  purposeBtnText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  purposeBtnTextActive: { color: "#fff" },

  // Bin cleaning banner
  binCleanBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  binCleanBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#0369A1",
    lineHeight: 18,
  },

  // Extra services banner
  extraServicesBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  extraServicesBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#15803D",
    lineHeight: 18,
  },

  // Extra bin cleaning add-on section
  extraBinSection: {
    backgroundColor: "#F0F9FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    padding: 14,
    marginBottom: 14,
  },
  extraBinHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  extraBinTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0284C7",
  },
  extraBinSub: {
    fontSize: 12,
    color: "#0369A1",
    marginBottom: 10,
  },

  // Fare card add-on row
  fareAddOnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  fareAddOnLabel: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
  },
  fareAddOnAmount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0284C7",
  },

  // Fare card — bin cleaning variant
  fareCardBinClean: {
    borderColor: "#BAE6FD",
  },

  // Recycler materials sub-text
  recyclerMaterials: { fontSize: 11, color: "#6B7280", marginTop: 1 },

  // No results
  noResultsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
    justifyContent: "center",
  },
  noResultsText: { fontSize: 14, color: "#9CA3AF" },

  // ── Offer negotiation card ────────────────────────────────────
  offerCard: {
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  offerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  offerCardTitle: { fontSize: 15, fontWeight: "800", color: "#111" },
  offerCardHint: { fontSize: 13, color: "#6B7280", lineHeight: 18 },
  offerMetaRow: {
    flexDirection: "row",
    gap: 10,
  },
  offerMetaPill: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 3,
  },
  offerMetaFloorPill: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  offerMetaLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  offerMetaValue: { fontSize: 16, fontWeight: "800", color: "#111" },
  offerInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GREEN,
    paddingHorizontal: 14,
    gap: 6,
  },
  offerInputRowError: { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
  offerRPrefix: { fontSize: 20, fontWeight: "800", color: GREEN },
  offerInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: "800",
    color: "#111",
    paddingVertical: 12,
  },
  offerErrorText: { fontSize: 12, color: "#EF4444", fontWeight: "600" },
});
