import CollectorLayout from "@/components/CollectorLayout";
import CustomButton from "@/components/customButton";
import { useFetch } from "@/lib/fetch";
import { useLocationStore } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

const GREEN = "#1AB045";

interface CollectorDriver {
  id: number;
  name: string;
  vehicle_type: string;
  number_plate: string;
  phone: string;
  is_available: boolean;
  distance_km: number | null;
}

const ConfirmCollector = () => {
  const router = useRouter();
  const {
    calculatedFare,
    offeredPrice,
    wasteLabel,
    wasteType,
    weightTons,
    binsCount,
    purpose,
    extraPurposes,
    extra_bins_count,
  } = useLocalSearchParams<{
    calculatedFare: string;
    offeredPrice: string;
    wasteLabel: string;
    wasteType: string;
    weightTons: string;
    binsCount: string;
    purpose: string;
    extraPurposes: string;
    extra_bins_count: string;
  }>();

  const { userLatitude, userLongitude } = useLocationStore();
  const purposeParam = purpose ?? "dispose";

  const driverUrl =
    userLatitude && userLongitude
      ? `/(api)/drivers?lat=${userLatitude}&lng=${userLongitude}&purpose=${purposeParam}`
      : `/(api)/drivers?purpose=${purposeParam}`;

  const { data: drivers, loading } = useFetch<CollectorDriver[]>(driverUrl);
  const availableCount = (drivers ?? []).filter((d) => d.is_available).length;

  const fareDisplay =
    calculatedFare && Number(calculatedFare) > 0
      ? Number(calculatedFare).toFixed(2)
      : "—";
  const offerDisplay =
    offeredPrice && Number(offeredPrice) > 0
      ? Number(offeredPrice).toFixed(2)
      : fareDisplay;

  return (
    <CollectorLayout title="Confirm Request" snapPoints={["65%", "90%"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Send Real-Time Request</Text>

        {/* Waste summary pill */}
        {wasteLabel ? (
          <View style={styles.wasteSummary}>
            <Ionicons name="trash-outline" size={15} color={GREEN} />
            <Text style={styles.wasteSummaryText} numberOfLines={1}>
              {wasteLabel}
              {binsCount
                ? ` · ${binsCount} ${parseInt(binsCount) === 1 ? "bin" : "bins"} (≈ ${weightTons} t)`
                : weightTons
                ? ` · ${weightTons} ton`
                : ""}
            </Text>
          </View>
        ) : null}

        {/* Offer summary card */}
        <View style={styles.offerCard}>
          <View style={styles.offerCardHeader}>
            <Ionicons name="pricetag-outline" size={15} color={GREEN} />
            <Text style={styles.offerCardTitle}>Offer Summary</Text>
          </View>
          <View style={styles.offerRow}>
            <Text style={styles.offerLabel}>Suggested fare</Text>
            <Text style={styles.offerMuted}>R {fareDisplay}</Text>
          </View>
          <View style={styles.offerDivider} />
          <View style={styles.offerRow}>
            <Text style={styles.offerBold}>Your starting offer</Text>
            <Text style={styles.offerAmount}>R {offerDisplay}</Text>
          </View>
          <View style={styles.offerNote}>
            <Ionicons name="information-circle-outline" size={13} color="#6B7280" />
            <Text style={styles.offerNoteText}>
              Each collector can accept your offer or negotiate a different price in real time.
            </Text>
          </View>
        </View>

        {/* Nearby collector count card */}
        <View style={styles.countCard}>
          {loading ? (
            <ActivityIndicator size="small" color={GREEN} />
          ) : (
            <>
              <View style={styles.countIconWrap}>
                <Ionicons name="people-outline" size={22} color={GREEN} />
              </View>
              <View style={styles.countTextWrap}>
                <Text style={styles.countNumber}>{availableCount}</Text>
                <Text style={styles.countLabel}>
                  {purposeParam === "bin_cleaning" ? "bin cleaner" : "collector"}
                  {availableCount !== 1 ? "s" : ""} available nearby
                </Text>
              </View>
              <View
                style={[
                  styles.countBadge,
                  availableCount > 0 ? styles.countBadgeGreen : styles.countBadgeGray,
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    availableCount > 0
                      ? styles.countBadgeTextGreen
                      : styles.countBadgeTextGray,
                  ]}
                >
                  {availableCount > 0 ? "Ready" : "None"}
                </Text>
              </View>
            </>
          )}
        </View>

        <CustomButton
          title={
            loading
              ? "Checking availability…"
              : availableCount > 0
              ? `Send to ${availableCount} ${purposeParam === "bin_cleaning" ? "Bin Cleaner" : "Collector"}${availableCount !== 1 ? "s" : ""}`
              : `No ${purposeParam === "bin_cleaning" ? "Bin Cleaners" : "Collectors"} Available`
          }
          onPress={() => {
            router.push({
              pathname: "/(root)/book-collector",
              params: {
                fare_price: fareDisplay === "—" ? "0" : fareDisplay,
                offered_price: offerDisplay,
                waste_type: wasteType ?? "",
                weight_tons: weightTons ?? "",
                bins_count: binsCount ?? "",
                purpose: purposeParam,
                extra_purposes: extraPurposes ?? "",
                extra_bins_count: extra_bins_count ?? "",
                // No driver_id / driver_name → broadcast mode
              },
            });
          }}
          disabled={loading || availableCount === 0}
        />
      </View>
    </CollectorLayout>
  );
};

export default ConfirmCollector;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    color: "#111",
  },

  wasteSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#F0FDF4",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  wasteSummaryText: {
    fontSize: 13,
    color: "#166534",
    fontWeight: "600",
    maxWidth: 260,
  },

  offerCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  offerCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  offerCardTitle: { fontSize: 14, fontWeight: "700", color: "#374151" },
  offerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  offerLabel: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  offerMuted: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  offerBold: { fontSize: 15, color: "#111", fontWeight: "700" },
  offerAmount: { fontSize: 22, fontWeight: "800", color: GREEN },
  offerDivider: { height: 1, backgroundColor: "#E5E7EB" },
  offerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    padding: 10,
  },
  offerNoteText: { flex: 1, fontSize: 12, color: "#374151", lineHeight: 18 },

  countCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    minHeight: 78,
    justifyContent: "center",
  },
  countIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  countTextWrap: { flex: 1 },
  countNumber: { fontSize: 22, fontWeight: "800", color: "#111" },
  countLabel: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countBadgeGreen: { backgroundColor: "#DCFCE7" },
  countBadgeGray: { backgroundColor: "#F3F4F6" },
  countBadgeText: { fontSize: 12, fontWeight: "700" },
  countBadgeTextGreen: { color: "#166534" },
  countBadgeTextGray: { color: "#6B7280" },
});
