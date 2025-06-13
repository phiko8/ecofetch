import DisposalCard from "@/components/DisposalCard";
import GoogleTextInput from "@/components/GoogleTextInput";
import Map from "@/components/Map";
import { icons, images } from "@/constants";
import { useLocationStore } from "@/store";
import { useAuth, useUser } from "@clerk/clerk-expo";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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

const recentDesposals = [];

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    marginTop: 16,
  },
  flatList: {
    padding: 5,
  },
  flatListContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 20,
  },
  emptyImage: {
    width: 200,
    height: 200,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: "black",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    margin: 5,
  },
  headerText: {
    fontSize: 16,
    fontFamily: "jakartaEtraBold",
    fontWeight: "bold",
  },
});

export default function Page() {
  const { setUserLocation, setDestinationLocation } = useLocationStore();
  const { user } = useUser();
  const { signOut } = useAuth();

  const [hasPermissions, setHasPermissions] = useState(false);
  const loading = false;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  const handleDestinationPress = (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    setDestinationLocation(location);
    router.push("/(root)/find-collector");
  };

  useEffect(() => {
    const requestLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setHasPermissions(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync();
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: `${address[0].name}, ${address[0].region}`,
      });
    };

    requestLocation();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading disposals...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={recentDesposals.slice(0, 5)}
        renderItem={({ item }) => <DisposalCard disposal={item} />}
        style={styles.flatList}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.flatListContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Image
              source={images.noResult}
              style={styles.emptyImage}
              accessibilityLabel="No recent disposals found"
            />
            <Text style={styles.emptyText}>No recent disposals found</Text>
          </View>
        )}
        ListHeaderComponent={() => (
          <>
            <View style={styles.headerContainer}>
              <Text style={styles.headerText}>
                Welcome{" "}
                {user?.firstName ||
                  user?.emailAddresses[0]?.emailAddress.split("@")[0] ||
                  "User"}
              </Text>
              <TouchableOpacity
                onPress={handleSignOut}
                style={{
                  justifyContent: "center",
                  alignItems: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "white",
                }}
              >
                <Image source={icons.out} style={{ width: 20, height: 20 }} />
              </TouchableOpacity>
            </View>

            <GoogleTextInput handlePress={handleDestinationPress} />

            <Text
              style={{
                fontWeight: "bold",
                textAlign: "center",
                marginTop: 10,
              }}
            >
              Your Current Location
            </Text>
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "transparent",
                height: 300,
                marginBottom: 20,
                marginTop: 10,
              }}
            >
              <Map />
            </View>

            <Text
              style={{
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: 10,
                marginTop: 5,
              }}
            >
              Recent Disposals
            </Text>
          </>
        )}
      />
    </SafeAreaView>
  );
}
