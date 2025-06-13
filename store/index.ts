import { DriverStore, LocationStore, MarkerData } from "@/types/type";
import { create } from "zustand";

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
