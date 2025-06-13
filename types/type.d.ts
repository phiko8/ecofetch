import { TextInputProps, TouchableOpacityProps } from "react-native";

import { ImageSourcePropType } from "react-native";

declare interface GoogleInputProps {
  icon?: ImageSourcePropType;
  initialLocation?: string;
  containerStyle?: any;
  textInputBackgroundColor?: string;
  handlePress: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
}


declare interface Driver {
    driver_id: number;
    first_name: string;
    last_name: string;
    profile_image_url: string;
    car_image_url: string;
    car_type: string;
    rating: number;
}

declare interface MarkerData {
    destination_address: string;
    origin_address: string;
    latitude: number;
    longitude: number;
    id: number;
    title: string;
    profile_image_url: string;
    car_image_url: string;
    car_type: string;
    rating: number;
    first_name: string;
    last_name: string;
    time?: number;
    price?: string;
}

declare interface MapProps {
    destinationLatitude?: number;
    destinationLongitude?: number;
    onDriverTimesCalculated?: (driversWithTimes: MarkerData[]) => void;
    selectedDriver?: number | null;
    onMapReady?: () => void;
}

declare interface Driver {
    first_name: any;
    origin_address: string;
    destination_address: string;
    origin_latitude: number;
    origin_longitude: number;
    destination_latitude: number;
    destination_longitude: number;
    ride_time: number;
    fare_price: number;
    payment_status: string;
    driver_id: number;
    user_email: string;
    created_at: string;
    driver: {
        image_url: string | undefined;
        car_type: any;
        rating: ReactNode;
        profile_image_url: string | undefined;
        first_name: string;
        last_name: string;
        car_type: string;
    };
}

declare interface ButtonProps extends TouchableOpacityProps {
    title: string;
    bgVariant?: "primary" | "secondary" | "danger" | "outline" | "success";
    textVariant?: "primary" | "default" | "secondary" | "danger" | "success";
    IconLeft?: React.ComponentType<any>;
    IconRight?: React.ComponentType<any>;
    style?: any; // Replaces Tailwind className
}

declare interface GoogleInputProps {
    icon?: string;
    initialLocation?: string;
    containerStyle?: any;
    textInputBackgroundColor?: string;
    handlePress: ({
        latitude,
        longitude,
        address,
    }: {
        latitude: number;
        longitude: number;
        address: string;
    }) => void;
}

declare interface InputFieldProps extends TextInputProps {
    label: string;
    icon?: any;
    secureTextEntry?: boolean;
    labelStyle?: any;
    containerStyle?: any;
    inputStyle?: any;
    iconStyle?: any;
    style?: any;
}

declare interface PaymentProps {
    fullName: string;
    email: string;
    amount: string;
    driverId: number;
    rideTime: number;
}

declare interface LocationStore {
    userLatitude: number | null;
    userLongitude: number | null;
    userAddress: string | null;
    destinationLatitude: number | null;
    destinationLongitude: number | null;
    destinationAddress: string | null;
    setUserLocation: ({
        latitude,
        longitude,
        address,
    }: {
        latitude: number;
        longitude: number;
        address: string;
    }) => void;
    setDestinationLocation: ({
        latitude,
        longitude,
        address,
    }: {
        latitude: number;
        longitude: number;
        address: string;
    }) => void;
}

declare interface DriverStore {
    drivers: MarkerData[];
    selectedDriver: number | null;
    setSelectedDriver: (driverId: number) => void;
    setDrivers: (drivers: MarkerData[]) => void;
    clearSelectedDriver: () => void;
}

declare interface DriverCardProps {
    item: MarkerData;
    selected: number;
    setSelected: () => void;
    style?: any;
}
