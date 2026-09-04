import { DRIVER_DARK, DRIVER_LIGHT, useThemeStore } from "@/store";
import { useUser } from "@clerk/clerk-expo";
import { useSignOut } from "@/lib/useSignOut";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import ReactNativeModal from "react-native-modal";
import GoogleTextInput from "@/components/GoogleTextInput";

import { icons } from "@/constants";
const FALLBACK_AVATAR = icons.person;
import { SafeAreaView } from "react-native-safe-area-context";

import InputField from "@/components/input-field";
import { useFetch } from "@/lib/fetch";

const BLUE = "#F97316";
const GREEN = "#1AB045";

const DriverProfile = () => {
  const { user } = useUser();
  const { performSignOut, loading: signingOut } = useSignOut();
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const t = isDark ? DRIVER_DARK : DRIVER_LIGHT;

  const { data: userData, refetch } = useFetch<{ role: string; status: string; name: string }>(
    user?.id ? `/(api)/user?clerkId=${user.id}` : null
  );

  const { data: driverData, refetch: refetchDriverData } = useFetch<{
    phone: string; vehicle_type: string; license_number: string;
    number_plate: string; id_number: string;
    area: string | null; area_latitude: number | null; area_longitude: number | null;
    service_type: string | null;
  }>(user?.id ? `/(api)/drivers?clerkId=${user.id}` : null);

  // ── Operating-area change state ───────────────────────────────
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [pendingArea, setPendingArea] = useState("");
  const [pendingAreaLat, setPendingAreaLat] = useState<number | null>(null);
  const [pendingAreaLng, setPendingAreaLng] = useState<number | null>(null);
  const [savingArea, setSavingArea] = useState(false);
  const [areaError, setAreaError] = useState("");
  const [areaSuccess, setAreaSuccess] = useState(false);

  // ── Service type state ────────────────────────────────────────
  const [serviceType, setServiceType] = useState<string | null>(null);
  const [savingServiceType, setSavingServiceType] = useState(false);
  const [serviceTypeError, setServiceTypeError] = useState("");

  // Sync service type from fetched driver data
  const currentServiceType = serviceType ?? driverData?.service_type ?? "collector";

  const handleServiceTypeChange = async (value: string) => {
    if (!user?.id || value === currentServiceType) return;
    setServiceType(value); // optimistic update
    setSavingServiceType(true);
    setServiceTypeError("");
    try {
      const res = await fetch("/(api)/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: user.id, serviceType: value }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServiceType(null); // revert optimistic
        setServiceTypeError(json?.error ?? "Failed to update. Try again.");
      }
    } catch {
      setServiceType(null);
      setServiceTypeError("Network error. Please try again.");
    } finally {
      setSavingServiceType(false);
    }
  };

  const openAreaModal = () => {
    setPendingArea("");
    setPendingAreaLat(null);
    setPendingAreaLng(null);
    setAreaError("");
    setAreaSuccess(false);
    setAreaModalVisible(true);
  };

  const handleSaveArea = async () => {
    if (!pendingArea || pendingAreaLat == null || pendingAreaLng == null) {
      setAreaError("Please search for and select an area first.");
      return;
    }
    if (!user?.id) return;
    setAreaError("");
    setSavingArea(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setAreaError("Location permission is required to verify you are in the area.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      // Use raw fetch so we can read the server error body on non-2xx responses
      const response = await fetch("/(api)/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          area: pendingArea,
          areaLatitude: pendingAreaLat,
          areaLongitude: pendingAreaLng,
          currentLatitude: pos.coords.latitude,
          currentLongitude: pos.coords.longitude,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setAreaError(json?.error ?? "Failed to update area. Please try again.");
      } else {
        setAreaSuccess(true);
        refetchDriverData();
        setTimeout(() => setAreaModalVisible(false), 1200);
      }
    } catch {
      setAreaError("Failed to update area. Please check your connection and try again.");
    } finally {
      setSavingArea(false);
    }
  };

  // Re-fetch every time this screen is visited so approval changes show immediately
  useFocusEffect(useCallback(() => { refetch(); }, []));

  const isAdmin = userData?.role === "admin";

  // Fall back to DB name when Clerk doesn't have it (e.g. driver-register flow)
  const dbNameParts = (userData?.name ?? "").trim().split(" ");
  const dbFirstName = dbNameParts[0] || "";
  const dbLastName = dbNameParts.slice(1).join(" ") || "";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.header, { color: BLUE }]}>Driver Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Image
            source={
              user?.externalAccounts?.[0]?.imageUrl ?? user?.imageUrl
                ? { uri: user?.externalAccounts?.[0]?.imageUrl ?? user?.imageUrl }
                : FALLBACK_AVATAR
            }
            defaultSource={FALLBACK_AVATAR}
            style={styles.avatar}
          />
          {/* Driver badge */}
          <View style={styles.driverBadge}>
            <Ionicons name="car" size={13} color="#fff" />
            <Text style={styles.driverBadgeText}>COLLECTOR</Text>
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor:
                  userData?.status === "approved"
                    ? isDark ? "#0E3320" : "#D1FAE5"
                    : isDark ? "#3A2E0E" : "#FEF3C7",
              },
            ]}
          >
            <Ionicons
              name={
                userData?.status === "approved"
                  ? "checkmark-circle"
                  : "time-outline"
              }
              size={14}
              color={userData?.status === "approved" ? "#065F46" : "#92400E"}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    userData?.status === "approved" ? "#065F46" : "#92400E",
                },
              ]}
            >
              {userData?.status === "approved"
                ? "Account Approved"
                : "Pending Approval"}
            </Text>
          </View>
        </View>

        {/* Dark / light mode toggle row */}
        <TouchableOpacity
          style={[styles.themeRow, { backgroundColor: t.card, borderColor: t.border }]}
          onPress={toggleTheme}
          activeOpacity={0.8}
        >
          <View style={[styles.themeIconWrap, { backgroundColor: isDark ? "#1A3A5C" : "#E8F0F9" }]}>
            <Ionicons
              name={isDark ? "sunny" : "moon"}
              size={18}
              color={isDark ? "#FBBF24" : BLUE}
            />
          </View>
          <View style={styles.themeTextWrap}>
            <Text style={[styles.themeTitle, { color: t.text }]}>
              {isDark ? "Dark Mode" : "Light Mode"}
            </Text>
            <Text style={[styles.themeSub, { color: t.subText }]}>
              Tap to switch to {isDark ? "light" : "dark"} mode
            </Text>
          </View>
          <View style={[styles.themeBadge, { backgroundColor: isDark ? "#1A3A5C" : "#E8F0F9" }]}>
            <Text style={[styles.themeBadgeText, { color: isDark ? "#FBBF24" : BLUE }]}>
              {isDark ? "DARK" : "LIGHT"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Admin button */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => router.push("/(root)/admin")}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
            <Text style={styles.adminBtnText}>Admin Panel</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color="rgba(255,255,255,0.7)"
            />
          </TouchableOpacity>
        )}

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: t.card, shadowColor: isDark ? "#000" : "#ccc" }]}>
          <InputField
            label="First name"
            placeholder={user?.firstName || dbFirstName || "Not Found"}
            editable={false}
          />
          <InputField
            label="Last name"
            placeholder={user?.lastName || dbLastName || "Not Found"}
            editable={false}
          />
          <InputField
            label="Email"
            placeholder={
              user?.primaryEmailAddress?.emailAddress || "Not Found"
            }
            editable={false}
          />
          <InputField
            label="Phone"
            placeholder={
              driverData?.phone || user?.primaryPhoneNumber?.phoneNumber || "Not Found"
            }
            editable={false}
          />
        </View>

        {/* Registration details */}
        {driverData && (
          <View style={[styles.regCard, { backgroundColor: t.card }]}>
            <Text style={[styles.regTitle, { color: BLUE }]}>Registration Details</Text>
            {[
              { icon: "card-outline",           label: "ID Number",      value: driverData.id_number },
              { icon: "call-outline",           label: "Phone",          value: driverData.phone },
              { icon: "car-outline",            label: "Vehicle Type",   value: driverData.vehicle_type },
              { icon: "document-text-outline",  label: "License Number", value: driverData.license_number },
              { icon: "keypad-outline",         label: "Number Plate",   value: driverData.number_plate },
            ].map(({ icon, label, value }) =>
              value ? (
                <View key={label} style={[styles.regRow, { borderBottomColor: t.border }]}>
                  <Ionicons name={icon as any} size={16} color={BLUE} style={{ width: 22 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.regLabel, { color: t.subText }]}>{label}</Text>
                    <Text style={[styles.regValue, { color: t.text }]}>{value}</Text>
                  </View>
                </View>
              ) : null
            )}
          </View>
        )}

        {/* Operating Area */}
        <View style={[styles.areaCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.areaCardHeader}>
            <View style={styles.areaCardLeft}>
              <View style={[styles.areaIconWrap, { backgroundColor: isDark ? "#1A3A2A" : "#DCFCE7" }]}>
                <Ionicons name="location-outline" size={18} color={GREEN} />
              </View>
              <View>
                <Text style={[styles.areaLabel, { color: t.subText }]}>Operating Area</Text>
                <Text style={[styles.areaValue, { color: t.text }]} numberOfLines={2}>
                  {driverData?.area || "No area set"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.changeAreaBtn, { backgroundColor: isDark ? "#1A3A2A" : "#DCFCE7" }]}
              onPress={openAreaModal}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil-outline" size={14} color={GREEN} />
              <Text style={[styles.changeAreaBtnText, { color: GREEN }]}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Service Type Card */}
        <View style={[styles.serviceTypeCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.serviceTypeHeader}>
            <View style={[styles.areaIconWrap, { backgroundColor: isDark ? "#1A2A3A" : "#DBEAFE" }]}>
              <Ionicons name="construct-outline" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.areaLabel, { color: t.subText }]}>Service Type</Text>
              <Text style={[styles.areaValue, { color: t.text }]}>
                {currentServiceType === "both"
                  ? "All Services"
                  : currentServiceType === "bin_cleaner"
                  ? "Bin Cleaning"
                  : "Waste Collector"}
              </Text>
            </View>
            {savingServiceType && <ActivityIndicator size="small" color={GREEN} />}
          </View>

          <Text style={[styles.serviceTypeHint, { color: t.subText }]}>
            Choose which job types you want to receive requests for.
          </Text>

          <View style={styles.serviceTypeBtnRow}>
            {([
              { value: "collector",   label: "Waste\nCollector",  icon: "trash-outline",    color: GREEN },
              { value: "bin_cleaner", label: "Bin\nCleaner",      icon: "sparkles-outline", color: "#0284C7" },
              { value: "both",        label: "Both\nServices",    icon: "checkmark-done-outline", color: "#7C3AED" },
            ] as const).map(({ value, label, icon, color }) => {
              const active = currentServiceType === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.serviceTypeBtn,
                    active && { borderColor: color, backgroundColor: color + "18" },
                    { borderColor: active ? color : t.border },
                  ]}
                  onPress={() => handleServiceTypeChange(value)}
                  disabled={savingServiceType}
                  activeOpacity={0.8}
                >
                  <Ionicons name={icon} size={18} color={active ? color : (isDark ? "#9CA3AF" : "#6B7280")} />
                  <Text style={[styles.serviceTypeBtnLabel, { color: active ? color : t.subText }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!!serviceTypeError && (
            <Text style={styles.serviceTypeError}>{serviceTypeError}</Text>
          )}
        </View>

        {/* Change Area Modal */}
        <ReactNativeModal
          isVisible={areaModalVisible}
          onBackdropPress={() => !savingArea && setAreaModalVisible(false)}
          onBackButtonPress={() => !savingArea && setAreaModalVisible(false)}
          avoidKeyboard
          style={styles.modal}
        >
          <View style={[styles.modalContent, { backgroundColor: t.card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: t.text }]}>Change Operating Area</Text>
            <Text style={[styles.modalSub, { color: t.subText }]}>
              You must be physically within 30 km of the area you select.
            </Text>

            <View style={{ zIndex: 100 }}>
              <GoogleTextInput
                icon={icons.map}
                placeholder="Search for suburb or area…"
                containerStyle={{ backgroundColor: isDark ? "#1E1E1E" : "#F3F4F6", marginBottom: 4 }}
                textInputBackgroundColor={isDark ? "#1E1E1E" : "#F3F4F6"}
                handlePress={({ latitude, longitude, address }) => {
                  setPendingArea(address);
                  setPendingAreaLat(latitude);
                  setPendingAreaLng(longitude);
                  setAreaError("");
                }}
              />
            </View>

            {!!pendingArea && (
              <View style={[styles.selectedArea, { backgroundColor: isDark ? "#0E3320" : "#DCFCE7" }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color={GREEN} />
                <Text style={[styles.selectedAreaText, { color: GREEN }]} numberOfLines={2}>
                  {pendingArea}
                </Text>
              </View>
            )}

            {!!areaError && (
              <View style={styles.areaErrorBox}>
                <Ionicons name="alert-circle-outline" size={15} color="#EF4444" />
                <Text style={styles.areaErrorText}>{areaError}</Text>
              </View>
            )}

            {areaSuccess && (
              <View style={[styles.areaSuccessBox, { backgroundColor: isDark ? "#0E3320" : "#DCFCE7" }]}>
                <Ionicons name="checkmark-circle" size={15} color={GREEN} />
                <Text style={[styles.areaSuccessText, { color: GREEN }]}>Area updated!</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: t.border }]}
                onPress={() => setAreaModalVisible(false)}
                disabled={savingArea}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalCancelText, { color: t.subText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, (!pendingArea || savingArea) && { opacity: 0.6 }]}
                onPress={handleSaveArea}
                disabled={!pendingArea || savingArea}
                activeOpacity={0.8}
              >
                {savingArea ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Area</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ReactNativeModal>

        {/* Sign out */}
        <TouchableOpacity
          style={[
            styles.signOutBtn,
            { backgroundColor: isDark ? "#2A1414" : "#FFF5F5" },
          ]}
          onPress={performSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
        >
          <Ionicons name={signingOut ? "hourglass-outline" : "log-out-outline"} size={18} color="#EF4444" />
          <Text style={styles.signOutText}>{signingOut ? "Signing out…" : "Sign Out"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  header: {
    fontSize: 24,
    marginVertical: 20,
  },
  avatarContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  driverBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: -14,
  },
  driverBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statusRow: {
    alignItems: "center",
    marginBottom: 20,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Dark/light toggle row
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  themeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  themeTextWrap: { flex: 1 },
  themeTitle: { fontSize: 15, fontWeight: "700" },
  themeSub: { fontSize: 12, marginTop: 1 },
  themeBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  themeBadgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },

  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 20,
    gap: 10,
  },
  adminBtnText: { flex: 1, color: "#fff", fontWeight: "700", fontSize: 15 },
  infoCard: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    paddingVertical: 14,
  },
  signOutText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 15,
  },
  regCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  regTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 14,
  },
  regRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  regLabel: { fontSize: 11, fontWeight: "600" },
  regValue: { fontSize: 14, fontWeight: "600", marginTop: 2 },

  // Operating area card
  areaCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  areaCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  areaCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  areaIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  areaLabel: { fontSize: 11, fontWeight: "600" },
  areaValue: { fontSize: 14, fontWeight: "600", marginTop: 2, maxWidth: 200 },
  changeAreaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeAreaBtnText: { fontSize: 12, fontWeight: "700" },

  // Change area modal
  modal: { justifyContent: "flex-end", margin: 0 },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
    minHeight: 380,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 18,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  modalSub: { fontSize: 13, lineHeight: 18, marginBottom: 18 },
  selectedArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  selectedAreaText: { fontSize: 13, fontWeight: "600", flex: 1 },
  areaErrorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 10,
  },
  areaErrorText: { color: "#EF4444", fontSize: 13, flex: 1 },
  areaSuccessBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  areaSuccessText: { fontSize: 13, fontWeight: "600" },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 15, fontWeight: "600" },
  modalSaveBtn: {
    flex: 1.4,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalSaveText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Service type card
  serviceTypeCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  serviceTypeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  serviceTypeHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  serviceTypeBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  serviceTypeBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  serviceTypeBtnLabel: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 15,
  },
  serviceTypeError: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 2,
  },
});

export default DriverProfile;
