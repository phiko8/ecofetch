import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GREEN = "#1AB045";
const BLUE  = "#0284C7";
const DARK  = "#111827";
const GRAY  = "#6B7280";
const LIGHT_GRAY = "#9CA3AF";
const BG = "#F9FAFB";

// ── Bin Types & Base Cleaning Rates ─────────────────────────────
// Realistic South African bin cleaning market rates (2024-2026)
const BIN_TYPES = [
  { label: "Residential Wheelie Bin (240 L)", value: "residential_240", baseRate: 110 },
  { label: "Large Residential Bin (360 L)",   value: "residential_360", baseRate: 145 },
  { label: "Commercial Bin (660 L)",           value: "commercial_660",  baseRate: 195 },
  { label: "Commercial Bin (1100 L)",          value: "commercial_1100", baseRate: 265 },
  { label: "Outdoor / Litter Bin (140 L)",     value: "outdoor_140",     baseRate: 85  },
];

// ── Service Levels ───────────────────────────────────────────────
const SERVICE_LEVELS = [
  {
    label: "Standard Clean",
    value: "standard",
    multiplier: 1.0,
    desc: "High-pressure rinse & deodorise",
  },
  {
    label: "Deep Clean",
    value: "deep",
    multiplier: 1.40,
    desc: "Scrub, sanitise & deodorise",
  },
  {
    label: "Steam Clean (Premium)",
    value: "steam",
    multiplier: 1.80,
    desc: "Steam sanitise, power scrub & deodorise",
  },
];

// ── Fixed Cost Components ────────────────────────────────────────
const WATER_AGENTS_BASE  = 50;   // R flat — water & cleaning agents
const WATER_AGENTS_EXTRA = 12;   // R per additional bin
const LABOUR_BASE        = 90;   // R flat base labour
const LABOUR_EXTRA       = 25;   // R per additional bin
const SERVICE_FEE        = 100;  // R flat service & admin fee
const TRAVEL_RATE        = 3.5;  // R per km (driver travels to you)
const INACCESSIBLE_RATE  = 0.05; // 5% surcharge — difficult access

// ── Breakdown Interface ──────────────────────────────────────────
interface BinCleanBreakdown {
  cleaningCost: number;
  waterAgents: number;
  labour: number;
  travelCost: number;
  serviceFee: number;
  base: number;
  locationSurcharge: number;
  total: number;
}

// ── Price Calculation ────────────────────────────────────────────
function calculateBinCleaningPrice(
  binTypeValue: string,
  serviceLevelValue: string,
  binCount: number,
  distanceKm: number,
  isAccessible: boolean
): BinCleanBreakdown | null {
  const binType = BIN_TYPES.find((b) => b.value === binTypeValue);
  const service = SERVICE_LEVELS.find((s) => s.value === serviceLevelValue);
  if (!binType || !service || binCount <= 0) return null;

  const cleaningCost = binType.baseRate * service.multiplier * binCount;
  const waterAgents  = WATER_AGENTS_BASE + Math.max(0, binCount - 1) * WATER_AGENTS_EXTRA;
  const labour       = LABOUR_BASE + Math.max(0, binCount - 1) * LABOUR_EXTRA;
  const travelCost   = distanceKm > 0 ? distanceKm * TRAVEL_RATE : 0;
  const base         = cleaningCost + waterAgents + labour + travelCost + SERVICE_FEE;
  const locationSurcharge = isAccessible ? 0 : base * INACCESSIBLE_RATE;
  const total        = base + locationSurcharge;

  return {
    cleaningCost,
    waterAgents,
    labour,
    travelCost,
    serviceFee: SERVICE_FEE,
    base,
    locationSurcharge,
    total,
  };
}

function fmt(n: number) {
  return `R ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

// ── Picker Modal ─────────────────────────────────────────────────
interface PickerModalProps {
  visible: boolean;
  title: string;
  options: { label: string; value: string; desc?: string }[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

function PickerModal({ visible, title, options, selected, onSelect, onClose }: PickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.modalOption, selected === opt.value && styles.modalOptionSelected]}
              onPress={() => { onSelect(opt.value); onClose(); }}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.modalOptionText,
                    selected === opt.value && styles.modalOptionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                {opt.desc ? (
                  <Text style={styles.modalOptionDesc}>{opt.desc}</Text>
                ) : null}
              </View>
              {selected === opt.value && (
                <Ionicons name="checkmark" size={18} color={GREEN} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main Screen ──────────────────────────────────────────────────
export default function BinCleaning() {
  const [binType,       setBinType]       = useState("residential_240");
  const [serviceLevel,  setServiceLevel]  = useState("standard");
  const [binCount,      setBinCount]      = useState("");
  const [isAccessible,  setIsAccessible]  = useState(true);
  const [distance,      setDistance]      = useState("");

  const [binPickerOpen,     setBinPickerOpen]     = useState(false);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);

  const selectedBinType     = BIN_TYPES.find((b) => b.value === binType)!;
  const selectedServiceLevel = SERVICE_LEVELS.find((s) => s.value === serviceLevel)!;

  const breakdown = useMemo<BinCleanBreakdown | null>(() => {
    const count = parseInt(binCount, 10);
    const dist  = parseFloat(distance) || 0;
    return calculateBinCleaningPrice(binType, serviceLevel, count, dist, isAccessible);
  }, [binType, serviceLevel, binCount, isAccessible, distance]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bin Cleaning Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="sparkles" size={20} color={BLUE} />
          <Text style={styles.infoBannerText}>
            Price based on South African bin cleaning market rates. A collector visits your location — water, cleaning agents & labour included.
          </Text>
        </View>

        {/* ── Section: Bin Details ── */}
        <Text style={styles.sectionTitle}>Bin Details</Text>

        <View style={styles.card}>
          {/* Bin Type */}
          <Text style={styles.fieldLabel}>Bin Type</Text>
          <TouchableOpacity
            style={styles.selectorBtn}
            onPress={() => setBinPickerOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.selectorText} numberOfLines={1}>
              {selectedBinType.label}
            </Text>
            <Ionicons name="chevron-down" size={18} color={GRAY} />
          </TouchableOpacity>

          <View style={styles.rowHint}>
            <Ionicons name="cash-outline" size={14} color={LIGHT_GRAY} />
            <Text style={styles.hintText}>
              Base rate: {fmt(selectedBinType.baseRate)} / bin (standard clean)
            </Text>
          </View>

          {/* Number of Bins */}
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Number of Bins</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2"
              placeholderTextColor={LIGHT_GRAY}
              keyboardType="number-pad"
              value={binCount}
              onChangeText={(t) => setBinCount(t.replace(/[^0-9]/g, ""))}
            />
            <View style={styles.inputUnit}>
              <Text style={styles.inputUnitText}>
                {parseInt(binCount, 10) === 1 ? "bin" : "bins"}
              </Text>
            </View>
          </View>

          {parseInt(binCount, 10) >= 3 && (
            <View style={styles.discountRow}>
              <Ionicons name="pricetag-outline" size={14} color="#0284C7" />
              <Text style={styles.discountText}>
                {parseInt(binCount, 10) >= 6 ? "6+ bins: 14% volume discount applied" : "3–5 bins: 7% volume discount applied"}
              </Text>
            </View>
          )}
        </View>

        {/* ── Section: Service Level ── */}
        <Text style={styles.sectionTitle}>Service Level</Text>

        <View style={styles.card}>
          <View style={styles.serviceLevelRow}>
            {SERVICE_LEVELS.map((sl) => (
              <TouchableOpacity
                key={sl.value}
                style={[styles.serviceBtn, serviceLevel === sl.value && styles.serviceBtnActive]}
                onPress={() => setServiceLevel(sl.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.serviceBtnLabel, serviceLevel === sl.value && styles.serviceBtnLabelActive]}>
                  {sl.label.replace(" (Premium)", "")}
                </Text>
                <Text style={[styles.serviceBtnDesc, serviceLevel === sl.value && styles.serviceBtnDescActive]}>
                  {sl.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.rowHint}>
            <Ionicons name="information-circle-outline" size={14} color={LIGHT_GRAY} />
            <Text style={styles.hintText}>
              Multiplier: ×{selectedServiceLevel.multiplier.toFixed(2)} of base rate
            </Text>
          </View>
        </View>

        {/* ── Section: Location ── */}
        <Text style={styles.sectionTitle}>Location Access</Text>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Is the location vehicle accessible?</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, isAccessible && styles.toggleBtnActive]}
              onPress={() => setIsAccessible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="car-outline" size={16} color={isAccessible ? "#fff" : GRAY} />
              <Text style={[styles.toggleBtnText, isAccessible && styles.toggleBtnTextActive]}>
                Accessible
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isAccessible && styles.toggleBtnActive]}
              onPress={() => setIsAccessible(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={16} color={!isAccessible ? "#fff" : GRAY} />
              <Text style={[styles.toggleBtnText, !isAccessible && styles.toggleBtnTextActive]}>
                Not Accessible
              </Text>
            </TouchableOpacity>
          </View>
          {!isAccessible && (
            <View style={styles.surchargeNote}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.surchargeNoteText}>
                5% location surcharge applies
              </Text>
            </View>
          )}
        </View>

        {/* ── Section: Travel Distance (optional) ── */}
        <Text style={styles.sectionTitle}>Travel Distance (optional)</Text>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Distance from collector to your location (km)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 8"
              placeholderTextColor={LIGHT_GRAY}
              keyboardType="decimal-pad"
              value={distance}
              onChangeText={setDistance}
            />
            <View style={styles.inputUnit}>
              <Text style={styles.inputUnitText}>km</Text>
            </View>
          </View>
          <View style={styles.rowHint}>
            <Ionicons name="information-circle-outline" size={14} color={LIGHT_GRAY} />
            <Text style={styles.hintText}>
              Travel fee: R{TRAVEL_RATE.toFixed(2)}/km · Leave blank to exclude
            </Text>
          </View>
        </View>

        {/* ── Price Breakdown ── */}
        {breakdown && (
          <>
            <Text style={styles.sectionTitle}>Price Breakdown</Text>
            <View style={styles.breakdownCard}>
              <BreakdownRow
                label="Cleaning Cost"
                value={fmt(breakdown.cleaningCost)}
                sub={`${fmt(selectedBinType.baseRate)} × ×${selectedServiceLevel.multiplier.toFixed(2)} × ${binCount} bin${parseInt(binCount,10)===1?"":"s"}`}
              />
              <BreakdownRow
                label="Water & Cleaning Agents"
                value={fmt(breakdown.waterAgents)}
              />
              <BreakdownRow
                label="Labour"
                value={fmt(breakdown.labour)}
              />
              {breakdown.travelCost > 0 && (
                <BreakdownRow
                  label="Travel Cost"
                  value={fmt(breakdown.travelCost)}
                  sub={`${distance} km × R${TRAVEL_RATE}/km`}
                />
              )}
              <BreakdownRow
                label="Service Fee"
                value={fmt(breakdown.serviceFee)}
              />

              <View style={styles.divider} />

              <BreakdownRow label="Subtotal" value={fmt(breakdown.base)} bold />

              {!isAccessible && breakdown.locationSurcharge > 0 && (
                <BreakdownRow
                  label="Location Surcharge (5%)"
                  value={`+ ${fmt(breakdown.locationSurcharge)}`}
                  accent
                />
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{fmt(breakdown.total)}</Text>
              </View>
            </View>
          </>
        )}

        {!breakdown && (
          <View style={styles.incompleteNote}>
            <Ionicons name="calculator-outline" size={36} color="#D1D5DB" />
            <Text style={styles.incompleteNoteText}>
              Fill in bin type and count above to see your price estimate
            </Text>
          </View>
        )}

        {/* Book Button */}
        <TouchableOpacity
          style={[styles.bookBtn, !breakdown && styles.bookBtnDisabled]}
          disabled={!breakdown}
          activeOpacity={0.85}
          onPress={() => {
            if (breakdown) {
              router.push("/(root)/find-collector");
            }
          }}
        >
          <Ionicons name="sparkles-outline" size={20} color="#fff" />
          <Text style={styles.bookBtnText}>
            {breakdown
              ? `Request Bin Cleaner — ${fmt(breakdown.total)}`
              : "Complete the form to request"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          * Final price may vary based on actual bin count and condition. All fees include GST where applicable.
        </Text>
      </ScrollView>

      {/* Pickers */}
      <PickerModal
        visible={binPickerOpen}
        title="Select Bin Type"
        options={BIN_TYPES}
        selected={binType}
        onSelect={setBinType}
        onClose={() => setBinPickerOpen(false)}
      />
      <PickerModal
        visible={servicePickerOpen}
        title="Select Service Level"
        options={SERVICE_LEVELS.map((s) => ({ label: s.label, value: s.value, desc: s.desc }))}
        selected={serviceLevel}
        onSelect={setServiceLevel}
        onClose={() => setServicePickerOpen(false)}
      />
    </SafeAreaView>
  );
}

// ── Breakdown Row Component ──────────────────────────────────────
function BreakdownRow({
  label, value, sub, bold, accent,
}: {
  label: string; value: string; sub?: string; bold?: boolean; accent?: boolean;
}) {
  return (
    <View style={styles.breakdownRow}>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.breakdownLabel,
            bold && styles.breakdownLabelBold,
            accent && styles.breakdownLabelAccent,
          ]}
        >
          {label}
        </Text>
        {sub && <Text style={styles.breakdownSub}>{sub}</Text>}
      </View>
      <Text
        style={[
          styles.breakdownValue,
          bold && styles.breakdownValueBold,
          accent && styles.breakdownValueAccent,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: BG, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, color: DARK, fontWeight: "700" },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  // Info Banner
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  infoBannerText: { flex: 1, fontSize: 13, color: "#0369A1", lineHeight: 18 },

  // Section Title
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: DARK,
    marginBottom: 10,
    marginTop: 4,
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  // Field
  fieldLabel: { fontSize: 13, fontWeight: "600", color: DARK, marginBottom: 8 },

  // Selector
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectorText: { flex: 1, fontSize: 14, color: DARK, marginRight: 8 },

  // Input
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: DARK,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inputUnit: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputUnitText: { fontSize: 13, color: GRAY, fontWeight: "600" },

  // Hints
  rowHint: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 7 },
  hintText: { fontSize: 12, color: LIGHT_GRAY },

  // Volume discount note
  discountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
    padding: 8,
  },
  discountText: { fontSize: 12, color: "#0369A1", fontWeight: "600", flex: 1 },

  // Service level buttons
  serviceLevelRow: { flexDirection: "column", gap: 8 },
  serviceBtn: {
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: BG,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  serviceBtnActive: { backgroundColor: GREEN, borderColor: GREEN },
  serviceBtnLabel: { fontSize: 14, fontWeight: "700", color: DARK },
  serviceBtnLabelActive: { color: "#fff" },
  serviceBtnDesc: { fontSize: 12, color: GRAY, marginTop: 2 },
  serviceBtnDescActive: { color: "rgba(255,255,255,0.85)" },

  // Toggle
  toggleRow: { flexDirection: "row", gap: 10 },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: BG,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  toggleBtnActive: { backgroundColor: GREEN, borderColor: GREEN },
  toggleBtnText: { fontSize: 13, fontWeight: "600", color: GRAY },
  toggleBtnTextActive: { color: "#fff" },

  // Surcharge
  surchargeNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 8,
  },
  surchargeNoteText: { fontSize: 12, color: "#991B1B" },

  // Breakdown
  breakdownCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  breakdownLabel: { fontSize: 14, color: GRAY },
  breakdownLabelBold: { fontWeight: "700", color: DARK },
  breakdownLabelAccent: { color: GREEN, fontWeight: "600" },
  breakdownSub: { fontSize: 11, color: LIGHT_GRAY, marginTop: 2 },
  breakdownValue: { fontSize: 14, color: DARK, fontWeight: "600" },
  breakdownValueBold: { fontWeight: "700" },
  breakdownValueAccent: { color: GREEN },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 6 },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: { fontSize: 17, fontWeight: "700", color: DARK },
  totalValue: { fontSize: 20, fontWeight: "800", color: BLUE },

  // Incomplete note
  incompleteNote: { alignItems: "center", paddingVertical: 28, gap: 10 },
  incompleteNoteText: {
    fontSize: 13, color: LIGHT_GRAY, textAlign: "center", maxWidth: 240,
  },

  // Book Button
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: BLUE,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 14,
  },
  bookBtnDisabled: { backgroundColor: "#D1D5DB", shadowOpacity: 0, elevation: 0 },
  bookBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  // Disclaimer
  disclaimer: {
    fontSize: 11, color: LIGHT_GRAY, textAlign: "center",
    lineHeight: 16, paddingHorizontal: 10,
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 14,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: "#E5E7EB",
    borderRadius: 2, alignSelf: "center", marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: DARK, marginBottom: 14 },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalOptionSelected: {
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginHorizontal: -10,
  },
  modalOptionText: { fontSize: 14, color: DARK },
  modalOptionTextSelected: { color: GREEN, fontWeight: "700" },
  modalOptionDesc: { fontSize: 12, color: LIGHT_GRAY, marginTop: 2 },
});
