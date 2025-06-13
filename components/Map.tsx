import { icons } from '@/constants';
import { calculateRegion, generateMarkersFromData } from '@/lib/map';
import { useDriverStore, useLocationStore } from '@/store';
import { MarkerData } from '@/types/type';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';



const drivers = [
 {}
];

export default function Map() {
  const {
    userLongitude,
    userLatitude,
    destinationLatitude,
    destinationLongitude,
  } = useLocationStore();

  const { selectedDriver, setDrivers } = useDriverStore();

  const [markers, setMarkers] = useState<MarkerData[]>([]);

  const region = calculateRegion({
    userLongitude,
    userLatitude,
    destinationLatitude,
    destinationLongitude,
  });

  useEffect(() => {
    return setDrivers(drivers);
  }, []);

  useEffect(() => {
    if (Array.isArray(drivers) && userLatitude && userLongitude) {
      const newMarkers = generateMarkersFromData({
        data: drivers,
        userLatitude,
        userLongitude,
      });
      setMarkers(newMarkers);
    }
  }, [userLatitude, userLongitude]);

  return (
    <MapView
      provider={PROVIDER_DEFAULT}
      style={styles.map}
      initialRegion={region}
      showsUserLocation={true}
      customMapStyle={[
        {
          featureType: 'poi',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
      ]}
    >
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={{
            latitude: marker.latitude,
            longitude: marker.longitude,
          }}
          title={marker.title}
          image={
            selectedDriver === marker.id ? icons.selectedMarker : icons.marker
          }
        />
      ))}
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
});
