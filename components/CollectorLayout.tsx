import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import React, { ReactNode, useRef } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import Map from "@/components/Map";
import { icons } from "@/constants";

type CollectorLayoutProps = {
  title: string | ReactNode;
  snapPoints?: string[];
  children: ReactNode;
};

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  arrow: {
    position: "absolute",
    width: 24,
    height: 24,
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
  },
});

const CollectorLayout: React.FC<CollectorLayoutProps> = ({
  title,
  snapPoints = ["40%", "85%"],
  children,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);

  return (
    <GestureHandlerRootView className="flex-1">
      <View className="flex-1 bg-white">
        <View className="flex flex-col h-screen bg-blue-500">
          {/* Top bar with back button and title */}
          <View className="flex flex-row absolute z-10 top-16 items-center justify-start px-5">
            <TouchableOpacity onPress={() => router.back()}>
              <View style={styles.buttonContainer}>
                <View style={styles.circle}>
                  <Image
                    source={icons.backArrow}
                    resizeMode="contain"
                    style={styles.arrow}
                  />
                </View>
                <Text style={styles.text}>Go Back</Text>
              </View>
            </TouchableOpacity>
            <View className="ml-5">
              {typeof title === "string" ? (
                <Text className="text-xl font-JakartaSemiBold">{title}</Text>
              ) : (
                title
              )}
            </View>
          </View>
          <Map />
        </View>

        {/* Bottom sheet */}
        <BottomSheet ref={bottomSheetRef} snapPoints={snapPoints} index={0}>
          <BottomSheetView style={{ flex: 1, padding: 20 }}>
            {children}
          </BottomSheetView>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
};

export default CollectorLayout;
