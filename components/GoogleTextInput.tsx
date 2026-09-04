import { icons } from "@/constants";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View, ViewStyle } from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { Ionicons } from "@expo/vector-icons";

const googlePlacesApiKey = process.env.EXPO_PUBLIC_PLACES_API_KEY;

interface LocationResult {
  latitude: number;
  longitude: number;
  address: string;
}

export interface RecentPlace {
  description: string;
  latitude: number;
  longitude: number;
}

interface GoogleInputProps {
  icon?: any;
  initialLocation?: string;
  containerStyle?: ViewStyle;
  textInputBackgroundColor?: string;
  handlePress: (location: LocationResult) => void;
  queryExtras?: Record<string, string>;
  placeholder?: string;
  locationBias?: { lat: number; lng: number };
  recentPlaces?: RecentPlace[];
}

const GoogleTextInput: React.FC<GoogleInputProps> = ({
  icon,
  initialLocation,
  containerStyle,
  textInputBackgroundColor,
  handlePress,
  queryExtras = {},
  placeholder,
  locationBias,
  recentPlaces = [],
}) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    })();
  }, []);

  if (!googlePlacesApiKey) {
    return (
      <View style={[styles.errorContainer, containerStyle]}>
        <Text style={styles.errorText}>
          Location search unavailable: EXPO_PUBLIC_PLACES_API_KEY not set.
        </Text>
      </View>
    );
  }

  const handleLocationSelect = (data: any, details: any | null) => {
    if (details?.geometry?.location) {
      handlePress({
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
        address: data.description || details.formatted_address,
      });
    } else {
      handlePress({
        latitude: 0,
        longitude: 0,
        address: data?.description || "Unknown Location",
      });
    }
  };

  const predefinedPlaces = recentPlaces.map((p) => ({
    description: p.description,
    geometry: { location: { lat: p.latitude, lng: p.longitude } },
  }));

  return (
    <View style={[styles.container, containerStyle]}>
      <GooglePlacesAutocomplete
        placeholder={placeholder ?? initialLocation ?? "Search location…"}
        fetchDetails={true}
        debounce={200}
        enablePoweredByContainer={false}
        onPress={handleLocationSelect}
        predefinedPlaces={predefinedPlaces}
        query={{
          key: googlePlacesApiKey,
          language: "en",
          location: locationBias
            ? `${locationBias.lat},${locationBias.lng}`
            : userLocation
            ? `${userLocation.lat},${userLocation.lng}`
            : undefined,
          radius: (locationBias || userLocation) ? 20000 : undefined,
          ...queryExtras,
        }}
        renderRow={(rowData) => {
          const isRecent = predefinedPlaces.some(
            (p) => p.description === rowData.description
          );
          return (
            <View style={styles.rowContent}>
              <Ionicons
                name={isRecent ? "time-outline" : "location-outline"}
                size={16}
                color={isRecent ? "#6B7280" : "#9CA3AF"}
                style={styles.rowIcon}
              />
              <Text style={styles.rowText} numberOfLines={2}>
                {rowData.description}
              </Text>
            </View>
          );
        }}
        styles={{
          textInputContainer: {
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            marginHorizontal: 10,
            flex: 1,
          },
          textInput: {
            backgroundColor: textInputBackgroundColor || "white",
            color: "#000",
            fontSize: 16,
            fontWeight: "600",
            marginTop: 5,
            height: 50,
            paddingHorizontal: 15,
            paddingLeft: 40,
            borderRadius: 200,
            width: "100%",
          },
          listView: {
            backgroundColor: textInputBackgroundColor || "white",
            position: "absolute",
            top: 55,
            left: 0,
            right: 0,
            borderRadius: 10,
            shadowColor: "#d4d4d4",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 5,
            zIndex: 1000,
            maxHeight: 300,
          },
          row: {
            padding: 13,
            height: "auto" as any,
            flexDirection: "row",
          },
          description: {
            color: "#333",
            fontSize: 15,
          },
          predefinedPlacesDescription: {
            color: "#1faadb",
          },
        }}
        renderLeftButton={() => (
          <View style={styles.iconWrapper}>
            <Image
              source={icon ?? icons.search}
              style={styles.icon}
              resizeMode="contain"
            />
          </View>
        )}
        textInputProps={{ placeholderTextColor: "gray" }}
        predefinedPlaces={[]}
        filterReverseGeocodingByTypes={[]}
        currentLocation={false}
        keyboardShouldPersistTaps="handled"
        listUnderlayColor="#c8c7cc"
        listViewDisplayed="auto"
        minLength={2}
        nearbyPlacesAPI="GooglePlacesSearch"
        onFail={(error) => console.error("Google Places error:", error)}
        onNotFound={() => console.warn("No places found")}
        timeout={15000}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    zIndex: 50,
  },
  errorContainer: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "red",
    fontSize: 13,
    textAlign: "center",
  },
  iconWrapper: {
    position: "absolute",
    left: 3,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    paddingLeft: 4,
  },
  icon: {
    width: 20,
    height: 20,
    tintColor: "gray",
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingVertical: 2,
  },
  rowIcon: {
    marginRight: 10,
  },
  rowText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
});

export default GoogleTextInput;
