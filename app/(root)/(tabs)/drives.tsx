import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { images } from "@/constants";
import { fetchAPI, useFetch } from "@/lib/fetch";
import { Drive } from "@/types/type";

const GREEN = "#1AB045";

const STATUS_COLORS: Record<string, string> = {
  available: GREEN,
  full: "#F59E0B",
  completed: "#6B7280",
  cancelled: "#EF4444",
};

const DriveCard = ({
  drive,
  registering,
  registered,
  registerError,
  onRegister,
}: {
  drive: Drive;
  registering: boolean;
  registered: boolean;
  registerError: string | null;
  onRegister: (driveId: number) => void;
}) => {
  const statusColor = STATUS_COLORS[drive.status] ?? "#6B7280";
  const isFull = drive.available_slots === 0 || drive.status !== "available";

  const dateObj = new Date(drive.date);
  const dateStr = dateObj.toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.card}>
      {/* Top row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="car-outline" size={20} color={GREEN} />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {drive.title}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{drive.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailsGrid}>
        <DetailItem icon="location-outline" label="Area" value={drive.area} />
        <DetailItem icon="calendar-outline" label="Date" value={dateStr} />
        <DetailItem icon="time-outline" label="Time" value={timeStr} />
        <DetailItem
          icon="construct-outline"
          label="Vehicle"
          value={drive.vehicle_type}
        />
        <DetailItem
          icon="people-outline"
          label="Slots"
          value={`${drive.available_slots} / ${drive.total_slots}`}
        />
        <DetailItem
          icon="pricetag-outline"
          label="Price"
          value={drive.price === 0 ? "Free" : `R${drive.price}`}
        />
      </View>

      {/* Inline error */}
      {registerError && (
        <Text style={styles.cardError}>{registerError}</Text>
      )}

      {/* Action */}
      {registered ? (
        <View style={[styles.bookBtn, styles.bookBtnRegistered]}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.bookBtnText}>Registered</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.bookBtn, (isFull || registering) && styles.bookBtnDisabled]}
          disabled={isFull || registering}
          activeOpacity={0.8}
          onPress={() => onRegister(drive.id)}
        >
          {registering ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.bookBtnText}>
              {isFull ? "No Slots Available" : "Register for Drive"}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const DetailItem = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <View style={styles.detailItem}>
    <Ionicons name={icon as any} size={14} color="#6B7280" />
    <View style={styles.detailText}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  </View>
);

const FILTER_OPTIONS = ["All", "Available", "Full", "Completed"];

const Drives = () => {
  const [filter, setFilter] = useState("All");
  const { data: drives, loading } = useFetch<Drive[]>("/(api)/drives");
  const [registering, setRegistering] = useState<number | null>(null);
  const [registerErrors, setRegisterErrors] = useState<Record<number, string>>({});
  const registeredIds = useRef<Set<number>>(new Set());

  const handleRegister = async (driveId: number) => {
    if (registeredIds.current.has(driveId)) return;
    setRegistering(driveId);
    setRegisterErrors((prev) => {
      const next = { ...prev };
      delete next[driveId];
      return next;
    });
    try {
      const res = await fetchAPI("/(api)/drives", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveId }),
      });
      if (res?.error) {
        setRegisterErrors((prev) => ({
          ...prev,
          [driveId]: res.error === "Drive is full" ? "No slots left" : res.error,
        }));
      } else {
        registeredIds.current.add(driveId);
      }
    } catch {
      setRegisterErrors((prev) => ({
        ...prev,
        [driveId]: "Registration failed. Please try again.",
      }));
    } finally {
      setRegistering(null);
    }
  };

  const filtered =
    drives?.filter(
      (d) => filter === "All" || d.status === filter.toLowerCase(),
    ) ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <DriveCard
            drive={item}
            registering={registering === item.id}
            registered={registeredIds.current.has(item.id)}
            registerError={registerErrors[item.id] ?? null}
            onRegister={handleRegister}
          />
        )}
        style={styles.list}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={styles.header}>Collection Drives</Text>

            {/* Filter bar */}
            <View style={styles.filterRow}>
              {FILTER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.filterChip,
                    filter === opt && styles.filterChipActive,
                  ]}
                  onPress={() => setFilter(opt)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filter === opt && styles.filterChipTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={GREEN} />
            ) : (
              <>
                <Image
                  source={images.noResult}
                  style={styles.emptyImage}
                  resizeMode="contain"
                />
                <Text style={styles.emptyText}>No drives found</Text>
                <Text style={styles.emptySubText}>
                  Check back later for upcoming collection drives
                </Text>
              </>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  list: {
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingBottom: 110,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginTop: 20,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
  },
  filterChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  filterChipText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#fff",
  },

  /* Card */
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "45%",
    gap: 6,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 1,
  },
  detailValue: {
    fontSize: 13,
    color: "#111",
    fontWeight: "600",
  },
  bookBtn: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  bookBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  bookBtnRegistered: {
    backgroundColor: "#059669",
    flexDirection: "row",
  },
  bookBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  cardError: {
    fontSize: 12,
    color: "#EF4444",
    marginBottom: 4,
  },

  /* Empty */
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyImage: {
    width: 160,
    height: 160,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },
});

export default Drives;
