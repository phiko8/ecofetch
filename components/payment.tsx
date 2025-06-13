import { images } from "@/constants"; // Assuming you have images defined here
import { fetchAPI } from "@/lib/fetch";
import { useLocationStore } from "@/store";
import { PaymentProps } from "@/types/type";
import { useAuth } from "@clerk/clerk-expo";
import { useStripe } from "@stripe/stripe-react-native"; // Make sure you have this installed and imported correctly
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import ReactNativeModal from "react-native-modal";
import CustomButton from "./customButton";

const Payment = ({
  fullName,
  email,
  amount,
  driverId,
  rideTime,
}: PaymentProps) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const {
    userAddress,
    userLongitude,
    userLatitude,
    destinationLatitude,
    destinationAddress,
    destinationLongitude,
  } = useLocationStore();

  const { userId } = useAuth();
  const [success, setSuccess] = useState<boolean>(false);

  const openPaymentSheet = async () => {
    await initializePaymentSheet();

    const { error } = await presentPaymentSheet();

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else {
      setSuccess(true);
    }
  };

  const initializePaymentSheet = async () => {
    const { error } = await initPaymentSheet({
      merchantDisplayName: "Example, Inc.",
      intentConfiguration: {
        mode: {
          amount: parseInt(amount) * 100,
          currencyCode: "RSA",
        },
        confirmHandler: async (
          paymentMethod: { id: any },
          shouldSavePaymentMethod: any,
          intentCreationCallback: (arg0: { clientSecret: any }) => void
        ) => {
          const { paymentIntent, customer } = await fetchAPI(
            "/(api)/(stripe)/create",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: fullName || email.split("@")[0],
                email: email,
                amount: amount,
                paymentMethodId: paymentMethod.id,
              }),
            }
          );

          if (paymentIntent.client_secret) {
            const { result } = await fetchAPI("/(api)/(stripe)/pay", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                payment_method_id: paymentMethod.id,
                payment_intent_id: paymentIntent.id,
                customer_id: customer,
                client_secret: paymentIntent.client_secret,
              }),
            });

            if (result.client_secret) {
              await fetchAPI("/(api)/ride/create", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  origin_address: userAddress,
                  destination_address: destinationAddress,
                  origin_latitude: userLatitude,
                  origin_longitude: userLongitude,
                  destination_latitude: destinationLatitude,
                  destination_longitude: destinationLongitude,
                  ride_time: rideTime.toFixed(0),
                  fare_price: parseInt(amount) * 100,
                  payment_status: "paid",
                  driver_id: driverId,
                  user_id: userId,
                }),
              });

              intentCreationCallback({
                clientSecret: result.client_secret,
              });
            }
          }
        },
      },
      returnURL: "myapp://book-collector",
    });

    if (!error) {
      // You can add loading state here if needed
    }
  };

  return (
    <>
      <CustomButton title="Confirm Collector" onPress={openPaymentSheet} style={styles.button} />

      <ReactNativeModal isVisible={success} onBackdropPress={() => setSuccess(false)}>
        <View style={styles.modalContent}>
          <Image source={images.check} style={styles.checkImage} />

          <Text style={styles.successTitle}>Booking placed successfully</Text>

          <Text style={styles.successMessage}>
            Thank you for your booking. Your reservation has been successfully placed. Please proceed with your Disposal.
          </Text>

          <CustomButton
            title="Back Home"
            onPress={() => {
              setSuccess(false);
              router.push("/(root)/(tabs)/home");
            }}
            style={styles.backHomeButton}
          />
        </View>
      </ReactNativeModal>
    </>
  );
};

export default Payment;

const styles = StyleSheet.create({
  button: {
    marginVertical: 40,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 28,
    borderRadius: 24,
    alignItems: "center",
  },
  checkImage: {
    width: 112, // 28 * 4
    height: 112,
    marginTop: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 20,
  },
  successMessage: {
    fontSize: 16,
    color: "#666",
    fontWeight: "400",
    textAlign: "center",
    marginTop: 12,
  },
  backHomeButton: {
    marginTop: 20,
  },
});
