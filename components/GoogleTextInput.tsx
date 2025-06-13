import { icons } from '@/constants'; // Ensure this exists or provide a fallback
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// Ensure your .env file has this key and it's exposed
const googlePlacesApiKey = process.env.EXPO_PUBLIC_PLACES_API_KEY;

// Debug: Uncomment to check key
// console.log("Google Places API Key:", googlePlacesApiKey);

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

interface GoogleInputProps {
  icon?: any;
  initialLocation?: string;
  containerStyle?: string;
  textInputBackgroundColor?: string;
  handlePress: (location: Location) => void;
}

const GoogleTextInput: React.FC<GoogleInputProps> = ({
  icon,
  initialLocation,
  containerStyle,
  textInputBackgroundColor,
  handlePress,
}) => {
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    })();
  }, []);

  if (!googlePlacesApiKey) {
    return (
      <View className={`p-4 items-center justify-center ${containerStyle}`}>
        <Text style={{ color: 'red' }}>
          Google Places Autocomplete is unavailable: API Key missing.
        </Text>
      </View>
    );
  }

  const handleLocationSelect = (data: any, details: any | null) => {
    if (details?.geometry?.location) {
      const location: Location = {
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
        address: data.description || details.formatted_address,
      };
      handlePress(location);
      // router.push("/(root)/find-collector"); // Uncomment if navigation is always needed
    } else {
      console.warn('Warning: No location details returned from Google Places for:', data?.description);
      handlePress({
        latitude: 0,
        longitude: 0,
        address: data?.description || 'Unknown Location - Details Missing',
      });
    }
  };

  return (
    <View className={`flex flex-row items-center justify-center relative z-50 rounded-xl ${containerStyle}`}>
      <GooglePlacesAutocomplete
        placeholder={initialLocation ?? 'Want to dispose waste?'}
        fetchDetails={true}
        debounce={200}
        enablePoweredByContainer={false}
        onPress={handleLocationSelect}
        query={{
          key: googlePlacesApiKey,
          language: 'en',
          // Remove country restriction for wider results
          // components: 'country:us',
          // Add location and radius for local bias
          location: userLocation ? `${userLocation.lat},${userLocation.lng}` : undefined,
          radius: userLocation ? 50000 : undefined, // 50km radius (adjust as needed)
        }}
        styles={{
          textInputContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            marginHorizontal: 10,
            position: 'relative',
            flex: 1,
          },
          textInput: {
            backgroundColor: textInputBackgroundColor || 'white',
            color: '#000',
            fontSize: 16,
            fontWeight: '600',
            marginTop: 5,
            height: 50,
            paddingHorizontal: 15,
            paddingLeft: 40, // For icon
            borderRadius: 200,
            width: '100%',
          },
          listView: {
            backgroundColor: textInputBackgroundColor || 'white',
            position: 'absolute',
            top: 55,
            left: 0,
            right: 0,
            borderRadius: 10,
            shadowColor: '#d4d4d4',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 5,
            zIndex: 1000,
            maxHeight: 300,
          },
          row: {
            padding: 13,
            height: 'auto',
            flexDirection: 'row',
          },
          description: {
            color: '#333',
            fontSize: 15,
          },
          predefinedPlacesDescription: {
            color: '#1faadb',
          },
        }}
        renderLeftButton={() => (
          <View className="absolute left-3 top-0 bottom-0 justify-center items-center z-10 pl-1">
            <Image
              source={icon ? icon : (icons?.search || require('@/assets/icons/search.png'))}
              style={{ width: 20, height: 20, tintColor: 'gray' }}
              resizeMode="contain"
            />
          </View>
        )}
        textInputProps={{
          placeholderTextColor: 'gray',
        }}
        predefinedPlaces={[]}
        filterReverseGeocodingByTypes={[]}
        currentLocation={false}
        GooglePlacesSearchQuery={{
          type: 'geocode',
        }}
        keyboardShouldPersistTaps="handled"
        listUnderlayColor="#c8c7cc"
        listViewDisplayed="auto"
        minLength={2}
        nearbyPlacesAPI="GooglePlacesSearch"
        onFail={(error) => console.error("Google Places API Error (onFail):", error)}
        onNotFound={() => console.warn('No places found for the search term (onNotFound)')}
        onTimeout={() => console.warn('Google Places Autocomplete: request timeout (onTimeout)')}
        timeout={15000}
      />
    </View>
  );
};

export default GoogleTextInput;
