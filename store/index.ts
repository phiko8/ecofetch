import { DriverStore, LocationStore, MarkerData } from "@/types/type";
import { create } from "zustand";

// ── Driver theme tokens ────────────────────────────────────────────
export const DRIVER_LIGHT = {
  bg: "#F8FAFC",
  card: "#ffffff",
  border: "#E5E7EB",
  text: "#111827",
  subText: "#6B7280",
  muted: "#9CA3AF",
  inputBg: "#F3F4F6",
  pillBg: "#E8F0F9",
  fareRowBg: "#F9FAFB",
  summaryCardBg: "#F9FAFB",
  chipBg: "#ffffff",
};

export const DRIVER_DARK = {
  bg: "#0B1622",
  card: "#152032",
  border: "#1E3352",
  text: "#F1F5F9",
  subText: "#94A3B8",
  muted: "#4B6A8A",
  inputBg: "#1A2F48",
  pillBg: "#1A3A5C",
  fareRowBg: "#1A2F48",
  summaryCardBg: "#1A2F48",
  chipBg: "#152032",
};

interface ThemeStore {
  isDark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDark: false,
  toggle: () => set((s) => ({ isDark: !s.isDark })),
}));

// --- Location Store: For tracking user & destination coordinates ---
export const useLocationStore = create<LocationStore>((set) => ({
  userLatitude: null,
  userLongitude: null,
  userAddress: null,

  destinationLatitude: null,
  destinationLongitude: null,
  destinationAddress: null,

  // Set current user location
  setUserLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    set(() => ({
      userLatitude: latitude,
      userLongitude: longitude,
      userAddress: address,
    }));

    // Optionally clear selected driver if location changes
    const { selectedDriver, clearSelectedDriver } = useDriverStore.getState();
    if (selectedDriver) clearSelectedDriver();
  },

  // Set destination coordinates and address
  setDestinationLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    set(() => ({
      destinationLatitude: latitude,
      destinationLongitude: longitude,
      destinationAddress: address,
    }));

    // Optionally clear selected driver if destination changes
    const { selectedDriver, clearSelectedDriver } = useDriverStore.getState();
    if (selectedDriver) clearSelectedDriver();
  },
}));

// --- Booking Store: Holds transient booking state (e.g. waste photo) ---
// Photo is stored here instead of URL params to avoid serialising large base64 strings.
interface BookingStore {
  wastePhoto: string | null;
  setWastePhoto: (photo: string | null) => void;
}

export const useBookingStore = create<BookingStore>((set) => ({
  wastePhoto: null,
  setWastePhoto: (photo) => set({ wastePhoto: photo }),
}));

// --- Driver Store: Tracks nearby disposal drivers or vehicles ---
export const useDriverStore = create<DriverStore>((set) => ({
  drivers: [],

  selectedDriver: null,

  setSelectedDriver: (driverId: number) =>
    set(() => ({
      selectedDriver: driverId,
    })),

  setDrivers: (drivers: MarkerData[]) =>
    set(() => ({
      drivers,
    })),

  clearSelectedDriver: () =>
    set(() => ({
      selectedDriver: null,
    })),
}));
