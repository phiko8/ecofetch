import { Image, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { formatDate, formatTime } from "@/lib/utils";
import { Disposal } from "@/types/type";

const DisposalCard = ({ disposal }: { disposal: Disposal }) => {
  const {
    origin_address,
    destination_address,
    destination_latitude,
    destination_longitude,
    created_at,
    ride_time,
    payment_status,
    driver,
  } = disposal;

  const mapUri = `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=600&height=400&center=lonlat:${destination_longitude},${destination_latitude}&zoom=14&apiKey=${process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY}`;
  const isPaid = payment_status === "paid";

  console.log("Map URI:", mapUri); // For debugging

  return (
    <View style={styles.card}>
      <View style={styles.inner}>
        {/* Map and Location Info */}
        <View style={styles.topRow}>
          <Image
            source={{ uri: mapUri }}
            style={styles.mapImage}
            onError={(e) => console.log("Map image load error:", e.nativeEvent)}
          />
          <View style={styles.addressContainer}>
            <LocationRow iconName="navigate-outline" text={origin_address} />
            <LocationRow iconName="location-outline" text={destination_address} />
          </View>
        </View>

        {/* Driver Info */}
        <View style={styles.driverRow}>
          <Image
            source={{ uri: driver.image_url }}
            style={styles.driverImage}
            onError={() => console.log("Driver image failed to load")}
          />
          <Text style={styles.driverName}>{driver.first_name} {driver.last_name}</Text>
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
      </View>
    </View>
  );
};

export default DisposalCard;

// Reusable Components

const LocationRow = ({ iconName, text }: { iconName: string; text: string }) => (
  <View style={styles.locationRow}>
    <Ionicons name={iconName} size={18} color="#444" style={styles.icon} />
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

// Styles

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
  inner: {
    padding: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mapImage: {
    width: 80,
    height: 90,
    borderRadius: 8,
  },
  addressContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "space-between",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  icon: {
    marginRight: 8,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  driverImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#ccc", // fallback background
  },
  driverName: {
    fontSize: 16,
    fontWeight: "600",
  },
  detailsContainer: {
    backgroundColor: "#F0F4F8",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
  },
  paidText: {
    color: "green",
    textTransform: "capitalize",
  },
  unpaidText: {
    color: "red",
    textTransform: "capitalize",
  },
});
