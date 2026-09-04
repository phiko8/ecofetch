import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ReactNativeModal from "react-native-modal";

import { fetchAPI } from "@/lib/fetch";
import { formatDate, formatTime } from "@/lib/utils";
import { Disposal } from "@/types/type";

const DisposalCard = ({ disposal }: { disposal: Disposal }) => {
  const {
    ride_id,
    origin_address,
    destination_address,
    destination_latitude,
    destination_longitude,
    created_at,
    ride_time,
    payment_status,
    driver,
    rating: initialRating,
  } = disposal;

  const [rating, setRating] = useState<number | null>(initialRating ?? null);
  const [hovered, setHovered] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState("");

  const mapUri =
    `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=600&height=400` +
    `&center=lonlat:${destination_longitude},${destination_latitude}&zoom=14` +
    `&apiKey=${process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY}`;
  const isPaid = payment_status === "paid";
  const isCompleted = payment_status === "paid" || payment_status === "paid_cash" || payment_status === "paid_card";

  const submitRating = async (stars: number) => {
    setSubmitting(true);
    setRatingError("");
    try {
      const res = await fetchAPI("/(api)/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId: ride_id, action: "rate", rating: stars }),
      });
      if (res?.success) {
        setRating(stars);
        setShowModal(false);
      } else {
        setRatingError("Failed to submit rating. Try again.");
      }
    } catch {
      setRatingError("Failed to submit rating. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.inner}>
        {/* Map and Location Info */}
        <View style={styles.topRow}>
          <Image
            source={{ uri: mapUri }}
            style={styles.mapImage}
          />
          <View style={styles.addressContainer}>
            <LocationRow iconName="navigate-outline" text={origin_address} />
            <LocationRow iconName="location-outline" text={destination_address} />
          </View>
        </View>

        {/* Driver Info */}
        <View style={styles.driverRow}>
          <Image
            source={driver.image_url ? { uri: driver.image_url } : require("@/assets/icons/person.png")}
            defaultSource={require("@/assets/icons/person.png")}
            style={styles.driverImage}
          />
          <Text style={styles.driverName}>
            {driver.first_name}{driver.last_name ? ` ${driver.last_name}` : ""}
          </Text>
        </View>

        {/* Ride Details */}
        <View style={styles.detailsContainer}>
          <InfoRow label="Date & Time" value={`${formatDate(created_at)}, ${formatTime(ride_time)}`} />
          <InfoRow label="Car Type" value={driver.car_type} />
          <InfoRow
            label="Payment Status"
            value={payment_status}
            valueStyle={isPaid ? styles.paidText : styles.unpaidText}
          />
        </View>

        {/* Rating row */}
        {isCompleted && (
          <View style={styles.ratingRow}>
            {rating ? (
              <>
                <Text style={styles.ratingLabel}>Your rating:</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons
                      key={s}
                      name={s <= rating ? "star" : "star-outline"}
                      size={18}
                      color="#F59E0B"
                    />
                  ))}
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={styles.rateBtn}
                onPress={() => { setHovered(0); setShowModal(true); }}
              >
                <Ionicons name="star-outline" size={16} color="#fff" />
                <Text style={styles.rateBtnText}>Rate Driver</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Rating Modal */}
      <ReactNativeModal isVisible={showModal} onBackdropPress={() => setShowModal(false)}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Rate Your Driver</Text>
          <Text style={styles.modalSub}>
            How was your experience with {driver.first_name}?
          </Text>
          <View style={styles.modalStars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setHovered(s)}
                style={styles.starBtn}
              >
                <Ionicons
                  name={s <= hovered ? "star" : "star-outline"}
                  size={36}
                  color="#F59E0B"
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingHint}>
            {hovered === 0 ? "Tap a star to rate" :
             hovered === 1 ? "Poor" :
             hovered === 2 ? "Fair" :
             hovered === 3 ? "Good" :
             hovered === 4 ? "Great" : "Excellent!"}
          </Text>
          {ratingError ? <Text style={styles.modalError}>{ratingError}</Text> : null}
          {submitting ? (
            <ActivityIndicator style={{ marginTop: 16 }} color="#1AB045" />
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, !hovered && styles.submitBtnDisabled]}
              disabled={!hovered}
              onPress={() => submitRating(hovered)}
            >
              <Text style={styles.submitBtnText}>Submit Rating</Text>
            </TouchableOpacity>
          )}
        </View>
      </ReactNativeModal>
    </View>
  );
};

export default DisposalCard;

const LocationRow = ({ iconName, text }: { iconName: string; text: string }) => (
  <View style={styles.locationRow}>
    <Ionicons name={iconName as any} size={18} color="#444" style={styles.icon} />
    <Text style={styles.locationText} numberOfLines={1}>{text}</Text>
  </View>
);

const InfoRow = ({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, valueStyle]} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    shadowColor: "#ccc",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  inner: { padding: 12 },
  topRow: { flexDirection: "row", alignItems: "center" },
  mapImage: { width: 80, height: 90, borderRadius: 8 },
  addressContainer: { flex: 1, marginLeft: 16, justifyContent: "space-between" },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  icon: { marginRight: 8 },
  locationText: { fontSize: 14, fontWeight: "500", flexShrink: 1 },
  driverRow: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 4 },
  driverImage: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: "#ccc" },
  driverName: { fontSize: 16, fontWeight: "600" },
  detailsContainer: {
    backgroundColor: "#F0F4F8",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  label: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  value: { fontSize: 14, fontWeight: "600" },
  paidText: { color: "#1AB045", textTransform: "capitalize" },
  unpaidText: { color: "#EF4444", textTransform: "capitalize" },
  // Rating
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  ratingLabel: { fontSize: 13, color: "#6B7280" },
  starsRow: { flexDirection: "row", gap: 2 },
  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  rateBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  // Modal
  modal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 8 },
  modalSub: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 20 },
  modalStars: { flexDirection: "row", gap: 8, marginBottom: 8 },
  starBtn: { padding: 4 },
  ratingHint: { fontSize: 14, color: "#6B7280", marginBottom: 16, height: 20 },
  modalError: { color: "#EF4444", fontSize: 13, marginBottom: 8 },
  submitBtn: {
    backgroundColor: "#1AB045",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 4,
  },
  submitBtnDisabled: { backgroundColor: "#D1D5DB" },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
