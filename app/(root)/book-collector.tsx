import CollectorLayout from "@/components/CollectorLayout";
import CustomButton from "@/components/customButton";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import ReactNativeModal from "react-native-modal";

const BookCollector = () => {
  const { origin_address, destination_address, fare_price } = useLocalSearchParams();
  const [successVisible, setSuccessVisible] = useState(false);

  // On confirm, directly show success modal (cash payment assumed)
  const handleConfirm = () => {
    setSuccessVisible(true);
  };

  return (
    <CollectorLayout title="Book Collector" snapPoints={["65%", "85%"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Book Collector</Text>
        <Text>Origin: {origin_address ?? "No origin address"}</Text>
        <Text>Destination: {destination_address ?? "No destination address"}</Text>
        <Text>Fare Price: R{fare_price ?? "No fare price"}</Text>

        <CustomButton title="Confirm Booking (Cash Payment)" onPress={handleConfirm} style={styles.button} />

        <ReactNativeModal
          isVisible={successVisible}
          onBackdropPress={() => setSuccessVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Booking Confirmed!</Text>
            <Text style={styles.modalMessage}>
              Your booking has been successfully placed. Please pay cash to the driver.
            </Text>
            <CustomButton
              title="Close"
              onPress={() => setSuccessVisible(false)}
              style={styles.modalButton}
            />
          </View>
        </ReactNativeModal>
      </View>
    </CollectorLayout>
  );
};

export default BookCollector;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  button: {
    marginTop: 30,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 28,
    borderRadius: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  modalButton: {
    width: "100%",
  },
});

