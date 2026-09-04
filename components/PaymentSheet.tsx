import { fetchAPI } from "@/lib/fetch";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useStripe } from "@stripe/stripe-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ReactNativeModal from "react-native-modal";

const GREEN = "#1AB045";
const BLUE = "#1E3A5F";

interface Props {
  visible: boolean;
  rideId: string;
  farePrice: string;
  driverName: string;
  onSuccess: () => void;
}

export default function PaymentSheet({
  visible,
  rideId,
  farePrice,
  driverName,
  onSuccess,
}: Props) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { user } = useUser();
  const { userId } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);
  const [paidMethod, setPaidMethod] = useState<"cash" | "card" | null>(null);

  const markPaid = async (method: "cash" | "card") => {
    await fetchAPI("/(api)/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rideId: Number(rideId),
        driverClerkId: userId ?? "user",
        action: "pay",
        paymentMethod: method,
      }),
    });
  };

  const handleCash = async () => {
    setLoading(true);
    setError("");
    try {
      await markPaid("cash");
      setPaidMethod("cash");
      setPaid(true);
    } catch {
      setError("Could not record payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCard = async () => {
    setLoading(true);
    setError("");
    try {
      const amount = parseFloat(farePrice) || 0;
      const name =
        user?.firstName
          ? `${user.firstName} ${user.lastName ?? ""}`.trim()
          : "Customer";
      const email = user?.emailAddresses[0]?.emailAddress ?? "";

      // 1. Create payment intent on server
      const res = await fetchAPI("/(api)/(stripe)/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: String(amount), name, email }),
      });

      if (!res?.clientSecret) {
        setError("Could not initialise payment. Try again.");
        return;
      }

      // 2. Initialise the PaymentSheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Ecko Fetch",
        paymentIntentClientSecret: res.clientSecret,
        defaultBillingDetails: { name, email },
      });

      if (initError) {
        setError(initError.message);
        return;
      }

      // 3. Present the PaymentSheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== "Canceled") {
          setError(presentError.message);
        }
        return;
      }

      // 4. Mark ride as paid in DB
      await markPaid("card");
      setPaidMethod("card");
      setPaid(true);
    } catch {
      setError("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (paid) {
    return (
      <ReactNativeModal isVisible={visible} style={styles.modal}>
        <View style={styles.sheet}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={GREEN} />
          </View>
          <Text style={styles.successTitle}>Payment Complete!</Text>
          <Text style={styles.successSub}>
            {paidMethod === "cash"
              ? "Cash payment recorded. Thank you!"
              : "Card payment successful. Thank you!"}
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={onSuccess} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </ReactNativeModal>
    );
  }

  return (
    <ReactNativeModal isVisible={visible} style={styles.modal}>
      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.completeBadge}>
            <Ionicons name="checkmark-circle-outline" size={20} color={GREEN} />
            <Text style={styles.completeText}>Collection Complete</Text>
          </View>
          <Text style={styles.driverName}>Collected by {driverName}</Text>
        </View>

        {/* Amount */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Total Amount Due</Text>
          <Text style={styles.amountValue}>
            R {parseFloat(farePrice || "0").toFixed(2)}
          </Text>
        </View>

        {/* Payment options */}
        <Text style={styles.chooseLabel}>Choose payment method</Text>

        <View style={styles.optionRow}>
          {/* Cash */}
          <TouchableOpacity
            style={styles.optionBtn}
            onPress={handleCash}
            disabled={loading}
            activeOpacity={0.85}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#FEF9C3" }]}>
              <Ionicons name="cash-outline" size={28} color="#CA8A04" />
            </View>
            <Text style={styles.optionTitle}>Cash</Text>
            <Text style={styles.optionSub}>Pay in person</Text>
          </TouchableOpacity>

          {/* Card */}
          <TouchableOpacity
            style={[styles.optionBtn, styles.optionBtnCard]}
            onPress={handleCard}
            disabled={loading}
            activeOpacity={0.85}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="card-outline" size={28} color={BLUE} />
            </View>
            <Text style={[styles.optionTitle, { color: "#fff" }]}>Card</Text>
            <Text style={[styles.optionSub, { color: "#93C5FD" }]}>Pay via Stripe</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <ActivityIndicator color={GREEN} style={{ marginTop: 12 }} />
        )}

        {!!error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={15} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </ReactNativeModal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: "flex-end", margin: 0 },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 48,
    gap: 16,
  },
  header: { gap: 6 },
  completeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  completeText: { fontSize: 13, fontWeight: "700", color: GREEN },
  driverName: { fontSize: 16, fontWeight: "700", color: "#111", marginTop: 4 },

  amountBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 4,
  },
  amountLabel: { fontSize: 13, color: "#6B7280" },
  amountValue: { fontSize: 36, fontWeight: "800", color: BLUE },

  chooseLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },

  optionRow: { flexDirection: "row", gap: 12 },
  optionBtn: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  optionBtnCard: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  optionSub: { fontSize: 12, color: "#6B7280" },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 10,
  },
  errorText: { color: "#EF4444", fontSize: 13, flex: 1 },

  successIcon: { alignItems: "center", paddingTop: 8 },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#111", textAlign: "center" },
  successSub: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 22 },
  doneBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  doneBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
