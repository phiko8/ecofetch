import CollectorLayout from "@/components/CollectorLayout";
import CustomButton from "@/components/customButton";
import { fetchAPI } from "@/lib/fetch";
import { useBookingStore, useLocationStore } from "@/store";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ReactNativeModal from "react-native-modal";

const GREEN = "#1AB045";
const BLUE  = "#1E3A5F";

// ── Card helpers ─────────────────────────────────────────────────
function formatCardNumber(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

function validateCard(
  cardNumber: string,
  expiry: string,
  cvv: string,
  cardHolder: string
): string | null {
  const digits = cardNumber.replace(/\s/g, "");
  if (digits.length !== 16) return "Card number must be 16 digits.";
  const [mm, yy] = expiry.split("/");
  const month = parseInt(mm, 10);
  const year  = parseInt("20" + yy, 10);
  if (!mm || !yy || month < 1 || month > 12) return "Enter a valid expiry date (MM/YY).";
  const now = new Date();
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1))
    return "This card has expired.";
  if (cvv.length < 3) return "CVV must be 3 or 4 digits.";
  if (!cardHolder.trim()) return "Cardholder name is required.";
  return null;
}

// ── Component ────────────────────────────────────────────────────
const BookCollector = () => {
  const {
    driver_id, driver_name, fare_price,
    waste_type, weight_tons, bins_count,
    purpose, offered_price, extra_purposes, extra_bins_count,
  } = useLocalSearchParams();

  const extraPurposesList = (extra_purposes as string ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const extraBinsCount = parseInt(extra_bins_count as string ?? "0", 10) || 1;

  const wastePhoto = useBookingStore((s) => s.wastePhoto);
  const { userId } = useAuth();
  const { user }   = useUser();
  const {
    userAddress, destinationAddress,
    userLatitude, userLongitude,
    destinationLatitude, destinationLongitude,
  } = useLocationStore();

  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paymentMethod, setPaymentMethod]   = useState<"cash" | "card">("cash");

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry]         = useState("");
  const [cvv, setCvv]               = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardError, setCardError]   = useState("");

  const isBroadcast     = !driver_id;
  const baseFare        = Number(fare_price)    || 0;
  const offeredPriceNum = Number(offered_price) || baseFare;

  const handleConfirmPress = () => {
    if (!userId) {
      setError("You must be signed in to book a collector.");
      return;
    }
    setError("");
    setPaymentVisible(true);
  };

  const handlePaymentConfirm = async () => {
    if (paymentMethod === "card") {
      const err = validateCard(cardNumber, expiry, cvv, cardHolder);
      if (err) { setCardError(err); return; }
      setCardError("");
    }
    // Guard: Clerk userId can briefly be null during token refresh in production
    const resolvedUserId = userId || user?.id;
    if (!resolvedUserId) {
      setCardError("Session error — please close and reopen the app.");
      return;
    }

    setLoading(true);
    try {
      // Omit wastePhoto if it's too large to avoid exceeding Vercel's 4.5 MB body limit
      const MAX_PHOTO_LEN = 2_500_000; // ~1.9 MB binary
      const photoToSend = wastePhoto && wastePhoto.length <= MAX_PHOTO_LEN ? wastePhoto : null;

      const commonFields = {
        driverDbId:          isBroadcast ? null : Number(driver_id),
        userClerkId:         resolvedUserId,
        userName:            user?.fullName || user?.firstName ||
                             user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "",
        originAddress:       userAddress || "Unknown pickup",   // || not ?? so empty string is caught
        destinationAddress:  destinationAddress || null,
        originLatitude:      userLatitude,
        originLongitude:     userLongitude,
        destinationLatitude,
        destinationLongitude,
        paymentMethod,
        wastePhoto:          photoToSend,
      };

      const res = await fetchAPI("/(api)/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...commonFields,
          purpose:     purpose ?? "dispose",
          binsCount:   bins_count ? Number(bins_count) : null,
          wasteType:   waste_type ?? null,
          weightTons:  weight_tons ? Number(weight_tons) : null,
          offeredPrice: offeredPriceNum,
        }),
      });
      const newRideId = res?.data?.ride_id ?? null;

      // Fire extra service jobs (broadcast, no pre-calculated fare)
      if (extraPurposesList.length > 0) {
        await Promise.all(
          extraPurposesList.map((ep) =>
            fetchAPI("/(api)/jobs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...commonFields,
                driverDbId:   null, // always broadcast for extras
                purpose:      ep,
                binsCount:    ep === "bin_cleaning" ? extraBinsCount : null,
                wasteType:    null,
                weightTons:   null,
                offeredPrice: 0,
              }),
            }).catch(() => null) // don't fail primary booking if an extra fails
          )
        );
      }
      setPaymentVisible(false);
      router.replace({
        pathname: "/(root)/track-collector",
        params: {
          rideId:     String(newRideId ?? ""),
          driverName: isBroadcast ? "" : String(driver_name ?? ""),
          farePrice:  String(offeredPriceNum),
        },
      });
    } catch (err: any) {
      const msg = (err?.message ?? "") as string;
      if (msg.includes("409") || msg.toLowerCase().includes("no collectors")) {
        setCardError("No collectors available right now. Please try again later.");
      } else if (
        msg.startsWith("HTTP error") ||
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("failed to fetch")
      ) {
        setCardError("Connection error. Check your internet and try again.");
      } else if (msg) {
        // Real API error message (e.g. "Minimum offer is R200.00")
        setCardError(msg);
      } else {
        setCardError("Booking failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const pickupMapUri =
    userLatitude && userLongitude
      ? `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=800&height=300` +
        `&center=lonlat:${userLongitude},${userLatitude}&zoom=15` +
        `&marker=lonlat:${userLongitude},${userLatitude};type:awesome;color:%231AB045;size:medium` +
        `&apiKey=${process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY}`
      : null;

  const driverInitial = isBroadcast ? "" : String(driver_name ?? "C").charAt(0).toUpperCase();

  return (
    <CollectorLayout title="Book a Collector" snapPoints={["65%", "92%"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Collector hero card ───────────────────────────────── */}
        <View style={styles.collectorCard}>
          <View style={[styles.collectorAvatar, isBroadcast && styles.broadcastAvatar]}>
            {isBroadcast ? (
              <Ionicons name="radio-outline" size={26} color={GREEN} />
            ) : (
              <Text style={styles.collectorAvatarText}>{driverInitial}</Text>
            )}
          </View>
          <View style={styles.collectorInfo}>
            <Text style={styles.collectorName}>
              {isBroadcast ? "Any Available Collector" : String(driver_name ?? "Collector")}
            </Text>
            <View style={styles.collectorStatusRow}>
              <View style={styles.activeDot} />
              <Text style={styles.collectorStatusText}>
                {isBroadcast ? "Request sent to all nearby collectors" : "Available now"}
              </Text>
            </View>
          </View>
          {!isBroadcast && <Ionicons name="checkmark-circle" size={28} color={GREEN} />}
        </View>

        {/* ── Trip details card ─────────────────────────────────── */}
        <View style={styles.tripCard}>
          {pickupMapUri ? (
            <Image source={{ uri: pickupMapUri }} style={styles.mapPreview} resizeMode="cover" />
          ) : null}
          <View style={styles.tripRows}>
            {/* Pickup */}
            <View style={styles.tripRow}>
              <View style={styles.tripLineCol}>
                <View style={[styles.tripDot, { backgroundColor: GREEN }]} />
                {!!destinationAddress && <View style={styles.tripConnector} />}
              </View>
              <View style={styles.tripRowText}>
                <Text style={styles.tripRowLabel}>Pickup</Text>
                <Text style={styles.tripRowValue} numberOfLines={1}>
                  {userAddress ?? "Current location"}
                </Text>
              </View>
            </View>
            {/* Destination */}
            {!!destinationAddress && (
              <View style={styles.tripRow}>
                <View style={styles.tripLineCol}>
                  <View style={[styles.tripDot, { backgroundColor: BLUE }]} />
                </View>
                <View style={styles.tripRowText}>
                  <Text style={styles.tripRowLabel}>Destination</Text>
                  <Text style={styles.tripRowValue} numberOfLines={1}>{destinationAddress}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Offer & fare summary ──────────────────────────────── */}
        <View style={styles.fareCard}>
          <View style={styles.fareCardHeader}>
            <Ionicons name="pricetag-outline" size={15} color={GREEN} />
            <Text style={styles.fareCardHeaderText}>Offer Summary</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareRowLabel}>Calculated fare</Text>
            <Text style={styles.fareRowMuted}>R {baseFare.toFixed(2)}</Text>
          </View>
          <View style={styles.fareDivider} />
          <View style={styles.fareRow}>
            <Text style={styles.fareRowBold}>Your starting offer</Text>
            <Text style={styles.fareOfferAmount}>R {offeredPriceNum.toFixed(2)}</Text>
          </View>
          <View style={styles.fareNoteRow}>
            <Ionicons name="information-circle-outline" size={13} color="#6B7280" />
            <Text style={styles.fareNoteText}>
              The driver will see your offer and can accept or negotiate with you.
            </Text>
          </View>
        </View>

        {/* ── Waste photo preview ───────────────────────────────── */}
        {wastePhoto ? (
          <View style={styles.photoCard}>
            <View style={styles.photoCardHeader}>
              <Ionicons name="camera-outline" size={14} color={GREEN} />
              <Text style={styles.photoCardHeaderText}>Waste Photo Attached</Text>
            </View>
            <Image source={{ uri: wastePhoto }} style={styles.photoImg} resizeMode="cover" />
          </View>
        ) : null}

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <CustomButton
          title={`Send Request — R ${offeredPriceNum.toFixed(2)}`}
          onPress={handleConfirmPress}
          customStyle={styles.bookBtn}
        />
      </ScrollView>

      {/* ── Payment Method Modal ─────────────────────────────────── */}
      <ReactNativeModal
        isVisible={paymentVisible}
        onBackdropPress={() => !loading && setPaymentVisible(false)}
        onSwipeComplete={() => !loading && setPaymentVisible(false)}
        swipeDirection="down"
        style={styles.modalWrapper}
        avoidKeyboard
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.paymentSheet}>
            <View style={styles.sheetHandle} />

            {/* Offer summary pill */}
            <View style={styles.sheetOfferRow}>
              <View style={styles.sheetOfferIcon}>
                <Ionicons name="pricetag-outline" size={18} color={GREEN} />
              </View>
              <View>
                <Text style={styles.sheetOfferLabel}>Your starting offer</Text>
                <Text style={styles.sheetOfferAmount}>R {offeredPriceNum.toFixed(2)}</Text>
              </View>
            </View>

            <Text style={styles.sheetMethodLabel}>Payment Method</Text>

            {/* Method toggle */}
            <View style={styles.methodSwitch}>
              <TouchableOpacity
                style={[styles.methodBtn, paymentMethod === "cash" && styles.methodBtnActive]}
                onPress={() => { setPaymentMethod("cash"); setCardError(""); }}
                activeOpacity={0.8}
              >
                <Ionicons name="cash-outline" size={16} color={paymentMethod === "cash" ? "#fff" : "#6B7280"} />
                <Text style={[styles.methodBtnText, paymentMethod === "cash" && styles.methodBtnTextActive]}>
                  Cash
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodBtn, paymentMethod === "card" && styles.methodBtnActive]}
                onPress={() => { setPaymentMethod("card"); setCardError(""); }}
                activeOpacity={0.8}
              >
                <Ionicons name="card-outline" size={16} color={paymentMethod === "card" ? "#fff" : "#6B7280"} />
                <Text style={[styles.methodBtnText, paymentMethod === "card" && styles.methodBtnTextActive]}>
                  Card
                </Text>
              </TouchableOpacity>
            </View>

            {/* Cash info */}
            {paymentMethod === "cash" && (
              <View style={styles.cashInfo}>
                <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                <Text style={styles.cashInfoText}>
                  Pay the collector in cash on arrival. Please have the exact amount ready.
                </Text>
              </View>
            )}

            {/* Card form */}
            {paymentMethod === "card" && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.cardForm}>
                  <Text style={styles.fieldLabel}>Card Number</Text>
                  <View style={styles.cardInputRow}>
                    <Ionicons name="card-outline" size={18} color="#9CA3AF" style={styles.fieldIcon} />
                    <TextInput
                      style={styles.cardInput}
                      placeholder="1234 5678 9012 3456"
                      placeholderTextColor="#D1D5DB"
                      keyboardType="number-pad"
                      value={cardNumber}
                      onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                      maxLength={19}
                    />
                  </View>
                  <View style={styles.twoCol}>
                    <View style={styles.twoColItem}>
                      <Text style={styles.fieldLabel}>Expiry Date</Text>
                      <View style={styles.cardInputRow}>
                        <Ionicons name="calendar-outline" size={18} color="#9CA3AF" style={styles.fieldIcon} />
                        <TextInput
                          style={styles.cardInput}
                          placeholder="MM/YY"
                          placeholderTextColor="#D1D5DB"
                          keyboardType="number-pad"
                          value={expiry}
                          onChangeText={(t) => setExpiry(formatExpiry(t))}
                          maxLength={5}
                        />
                      </View>
                    </View>
                    <View style={styles.twoColItem}>
                      <Text style={styles.fieldLabel}>CVV</Text>
                      <View style={styles.cardInputRow}>
                        <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.fieldIcon} />
                        <TextInput
                          style={styles.cardInput}
                          placeholder="123"
                          placeholderTextColor="#D1D5DB"
                          keyboardType="number-pad"
                          secureTextEntry
                          value={cvv}
                          onChangeText={(t) => setCvv(t.replace(/\D/g, "").slice(0, 4))}
                          maxLength={4}
                        />
                      </View>
                    </View>
                  </View>
                  <Text style={styles.fieldLabel}>Cardholder Name</Text>
                  <View style={styles.cardInputRow}>
                    <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.fieldIcon} />
                    <TextInput
                      style={styles.cardInput}
                      placeholder="Full name on card"
                      placeholderTextColor="#D1D5DB"
                      autoCapitalize="words"
                      value={cardHolder}
                      onChangeText={setCardHolder}
                    />
                  </View>
                </View>
              </ScrollView>
            )}

            {!!cardError && (
              <View style={styles.cardErrorBox}>
                <Ionicons name="alert-circle-outline" size={15} color="#EF4444" />
                <Text style={styles.cardErrorText}>{cardError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.payBtn, loading && { opacity: 0.7 }]}
              onPress={handlePaymentConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={paymentMethod === "cash" ? "cash-outline" : "card-outline"}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.payBtnText}>
                    {paymentMethod === "cash"
                      ? `Confirm Cash — R ${offeredPriceNum.toFixed(2)}`
                      : `Pay R ${offeredPriceNum.toFixed(2)}`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ReactNativeModal>
    </CollectorLayout>
  );
};

export default BookCollector;

// ── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // Collector hero card
  collectorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    gap: 14,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  collectorAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  collectorAvatarText: { fontSize: 26, fontWeight: "800", color: GREEN },
  broadcastAvatar: { backgroundColor: "#EFF6FF" },
  collectorInfo: { flex: 1 },
  collectorName: { fontSize: 19, fontWeight: "800", color: "#111", marginBottom: 5 },
  collectorStatusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  collectorStatusText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },

  // Trip details card
  tripCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  mapPreview: { width: "100%", height: 110 },
  tripRows: { padding: 14, gap: 0 },
  tripRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  tripLineCol: { alignItems: "center", paddingTop: 4, width: 12 },
  tripDot: { width: 12, height: 12, borderRadius: 6 },
  tripConnector: { width: 2, height: 28, backgroundColor: "#D1D5DB", marginVertical: 2 },
  tripRowText: { flex: 1, paddingBottom: 10 },
  tripRowLabel: {
    fontSize: 11, color: "#9CA3AF", fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2,
  },
  tripRowValue: { fontSize: 14, color: "#111", fontWeight: "600", lineHeight: 20 },

  // Fare card
  fareCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  fareCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  fareCardHeaderText: { fontSize: 14, fontWeight: "700", color: "#374151" },
  fareRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fareRowLabel: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  fareRowMuted: { fontSize: 14, color: "#9CA3AF", fontWeight: "600", textDecorationLine: "line-through" },
  fareRowBold: { fontSize: 15, color: "#111", fontWeight: "700" },
  fareOfferAmount: { fontSize: 26, fontWeight: "800", color: GREEN },
  fareDivider: { height: 1, backgroundColor: "#E5E7EB" },
  fareNoteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    padding: 10,
  },
  fareNoteText: { flex: 1, fontSize: 12, color: "#374151", lineHeight: 18 },

  // Photo
  photoCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 14,
  },
  photoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoCardHeaderText: { fontSize: 12, color: "#166534", fontWeight: "600" },
  photoImg: { width: "100%", height: 160 },

  // Error
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FEF2F2", padding: 12, borderRadius: 12, marginBottom: 12,
  },
  errorText: { color: "#EF4444", fontSize: 13, flex: 1 },

  // Book button
  bookBtn: { backgroundColor: GREEN, marginTop: 4 },

  // ── Payment modal ─────────────────────────────────────────────
  modalWrapper: { justifyContent: "flex-end", margin: 0 },
  paymentSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 14,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: "#E5E7EB",
    borderRadius: 2, alignSelf: "center", marginBottom: 20,
  },

  // Offer summary in modal
  sheetOfferRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  sheetOfferIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center",
  },
  sheetOfferLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600", marginBottom: 2 },
  sheetOfferAmount: { fontSize: 24, fontWeight: "800", color: GREEN },
  sheetMethodLabel: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 12 },

  // Method switch
  methodSwitch: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  methodBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  methodBtnActive: {
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  methodBtnText: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
  methodBtnTextActive: { color: "#fff" },

  // Cash info
  cashInfo: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#F9FAFB", borderRadius: 12, padding: 14, marginBottom: 20,
  },
  cashInfoText: { flex: 1, fontSize: 13, color: "#6B7280", lineHeight: 20 },

  // Card form
  cardForm: { gap: 4, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 12 },
  cardInputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F9FAFB", borderRadius: 12,
    borderWidth: 1, borderColor: "#E5E7EB",
    paddingHorizontal: 12, paddingVertical: 12,
  },
  fieldIcon: { marginRight: 8 },
  cardInput: { flex: 1, fontSize: 15, color: "#111" },
  twoCol: { flexDirection: "row", gap: 12 },
  twoColItem: { flex: 1 },
  cardErrorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 12,
  },
  cardErrorText: { color: "#EF4444", fontSize: 13, flex: 1 },

  // Pay button
  payBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: GREEN, borderRadius: 16, paddingVertical: 16,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  payBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
