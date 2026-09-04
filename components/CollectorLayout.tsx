import { router } from "expo-router";
import React, { ReactNode } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Map from "@/components/Map";
import { icons } from "@/constants";

type CollectorLayoutProps = {
  title: string | ReactNode;
  snapPoints?: string[]; // kept for backwards compat, unused
  searchOverlay?: ReactNode;
  children: ReactNode;
};

const CollectorLayout: React.FC<CollectorLayoutProps> = ({ title, searchOverlay, children }) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Map section */}
      <View style={styles.mapContainer}>
        <Map />

        {/* Back button overlay */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Image source={icons.backArrow} style={styles.backIcon} resizeMode="contain" />
        </TouchableOpacity>

        {/* Title overlay */}
        <View style={styles.titleOverlay}>
          {typeof title === "string" ? (
            <Text style={styles.titleText}>{title}</Text>
          ) : (
            title
          )}
        </View>

        {/* Search input floats on the map, below back/title buttons */}
        {searchOverlay && (
          <View style={styles.searchOverlayContainer}>
            {searchOverlay}
          </View>
        )}
      </View>

      {/* Content card */}
      <View style={styles.card}>
        <View style={styles.handle} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          indicatorStyle="black"
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    overflow: "visible",
  },
  searchOverlayContainer: {
    position: "absolute",
    top: 68,
    left: 16,
    right: 16,
    zIndex: 50,
  },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  titleOverlay: {
    position: "absolute",
    top: 16,
    left: 68,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  card: {
    flex: 1.2,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
});

export default CollectorLayout;
