import { calculateRegion, generateMarkersFromData } from '@/lib/map';
import { useDriverStore, useLocationStore } from '@/store';
import { MarkerData } from '@/types/type';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

const GREEN = '#1AB045';
const GREEN_DARK = '#148A35';

export default function Map() {
  const {
    userLongitude,
    userLatitude,
    destinationLatitude,
    destinationLongitude,
  } = useLocationStore();

  const { drivers, selectedDriver } = useDriverStore();

  const mapRef = useRef<MapView>(null);
  const hasCenteredRef = useRef(false);

  // Auto-center map on user's exact location once it resolves
  useEffect(() => {
    if (userLatitude && userLongitude && !hasCenteredRef.current) {
      hasCenteredRef.current = true;
      mapRef.current?.animateToRegion(
        {
          latitude: userLatitude,
          longitude: userLongitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        700,
      );
    }
  }, [userLatitude, userLongitude]);

  const region = useMemo(
    () => calculateRegion({ userLongitude, userLatitude, destinationLatitude, destinationLongitude }),
    [userLatitude, userLongitude, destinationLatitude, destinationLongitude],
  );

  const markers: MarkerData[] = useMemo(() => {
    if (!Array.isArray(drivers) || drivers.length === 0 || !userLatitude || !userLongitude) {
      return [];
    }
    return generateMarkersFromData({ data: drivers as any, userLatitude, userLongitude });
  }, [drivers, userLatitude, userLongitude]);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_DEFAULT}
      style={styles.map}
      initialRegion={region}
      showsUserLocation={true}
      showsMyLocationButton={false}
      customMapStyle={[
        {
          featureType: 'poi',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
      ]}
    >
      {markers.map((marker) => {
        const isSelected = selectedDriver === marker.id;
        return (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            title={marker.title}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            {/* Custom view — pixel-density safe on all Android densities */}
            <View style={[styles.markerWrap, isSelected && styles.markerWrapSelected]}>
              <Ionicons name="car" size={isSelected ? 18 : 15} color="#fff" />
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  markerWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    // shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    // elevation for Android
    elevation: 4,
  },
  markerWrapSelected: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GREEN_DARK,
    borderWidth: 3,
    elevation: 6,
  },
});
