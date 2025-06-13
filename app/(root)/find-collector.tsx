import CollectorLayout from "@/components/CollectorLayout";
import CustomButton from "@/components/customButton";
import GoogleTextInput from "@/components/GoogleTextInput";
import { icons } from "@/constants";
import { useLocationStore } from "@/store";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";


const RequestWasteCollection = () => {
  const {
    userAddress,
    destinationAddress,
    setDestinationLocation,
    setUserLocation,
  } = useLocationStore();

  return (
    <CollectorLayout title={<Text style={styles.title}>Request Waste Collection</Text>}>
      {/* Pickup Address */}
      <View style={styles.section}>
        <Text style={styles.label}>Pickup Address</Text>
        <GoogleTextInput
          icon={icons.target}
          initialLocation={userAddress!}
          containerStyle={{ backgroundColor: "#f5f5f5" }}
          textInputBackgroundColor="#f5f5f5"
          handlePress={(location) => setUserLocation(location)}
        />
      </View>

      {/* Drop-off Facility - Optional */}
      <View style={styles.section}>
        <Text style={styles.label}>Waste Facility (Optional)</Text>
        <GoogleTextInput
          icon={icons.map}
          initialLocation={destinationAddress!}
          containerStyle={{ backgroundColor: "#f5f5f5" }}
          textInputBackgroundColor="transparent"
          handlePress={(location) => setDestinationLocation(location)}
        />
      </View>

      <CustomButton title="find now" onPress= {()=> router.push('/(root)/confirm-collector') } style={{marginTop: 5, }}/>
    </CollectorLayout>
  );
};

const styles = StyleSheet.create({
  title: {
    color: "#000",
  },
  section: {
    marginVertical: 12,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
});

export default RequestWasteCollection;
