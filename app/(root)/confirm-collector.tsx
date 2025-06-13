import CollectorLayout from "@/components/CollectorLayout";
import CustomButton from "@/components/customButton";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const mockDrivers = [
  {
    id: 1,
    first_name: "John",
    last_name: "Doe",
    car_type: "Toyota Prius",
    price: "120",
    origin_address: "123 Main St",
    destination_address: "456 Oak Ave",
  },
  {
    id: 2,
    first_name: "Jane",
    last_name: "Smith",
    car_type: "Honda Civic",
    price: "95",
    origin_address: "789 Elm Rd",
    destination_address: "321 Pine Ln",
  },
];

const ConfirmCollector = () => {
  const router = useRouter();
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);

  const selected = mockDrivers.find((d) => d.id === selectedDriverId);

  return (
    <CollectorLayout title={"Choose Collector"} snapPoints={["65%", "85%"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Select a Collector</Text>

        <FlatList
          data={mockDrivers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.driverCard,
                selectedDriverId === item.id && styles.selectedCard,
              ]}
              onPress={() => setSelectedDriverId(item.id)}
            >
              <Text style={styles.driverName}>
                {item.first_name} {item.last_name}
              </Text>
              <Text>Car: {item.car_type}</Text>
              <Text>Fare: R{item.price}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 30 }}
          ListFooterComponent={() =>
            selected ? (
              <View style={styles.footer}>
                <CustomButton
                  title="Select Collector"
                  onPress={() => {
                    router.push({
                      pathname: "/(root)/book-collector",
                      params: {
                        origin_address: String(selected.origin_address),
                        destination_address: String(selected.destination_address),
                        fare_price: String(selected.price),
                      },
                    });
                  }}
                />
              </View>
            ) : null
          }
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
    fontWeight: "bold",
    marginBottom: 16,
  },
  driverCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedCard: {
    borderColor: "#007bff",
    backgroundColor: "#e6f0ff",
  },
  driverName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  footer: {
    marginTop: 20,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%", // Ensure footer container is full width
  },
});
