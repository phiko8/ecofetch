import { TextInputProps, TouchableOpacityProps } from "react-native";

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

declare interface Disposal {
    ride_id: number;
    origin_address: string;
    destination_address: string;
    origin_latitude: number;
    origin_longitude: number;
    destination_latitude: number;
    destination_longitude: number;
    ride_time: number;
    fare_price: number;
    payment_status: string;
    created_at: string;
    rating: number | null;
    driver: {
        driver_id: number;
        first_name: string;
        last_name: string | null;
        image_url: string | null;
        car_type: string;
        number_plate: string;
        phone: string;
    };
}

declare interface Drive {
    id: number;
    title: string;
    area: string;
    date: string;
    vehicle_type: string;
    total_slots: number;
    available_slots: number;
    price: number;
    status: "available" | "full" | "completed" | "cancelled";
    created_at: string;
}

declare interface UserRegistration {
    id: number;
    name: string;
    email: string;
    clerk_id: string;
    role: string;
    id_number: string;
    status: "pending" | "approved" | "rejected" | "banned";
    created_at: string;
    phone: string;
    vehicle_type: string;
    license_number: string;
    number_plate: string;
}

declare interface BinCleaningPriceBreakdown {
    landfillFees: number;
    fuelCost: number;
    labour: number;
    serviceProvider: number;
    baseSubtotal: number;
    locationSurcharge: number;
    wasteMgmtFee: number;
    total: number;
}

declare interface BinCleaningBooking {
    wasteType: string;
    weightTons: number;
    isLocationAccessible: boolean;
    fuelType: string;
    fuelLocation: "coastal" | "inland";
    distanceKm: number;
    breakdown: BinCleaningPriceBreakdown;
}
