import CustomButton from "@/components/customButton";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-swiper";
import { onboarding } from "./constants/ondex"; // Replace with correct path to your onboarding data

const Onboarding = () => {
  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const goToNextSlide = () => {
    if (activeIndex < onboarding.length - 1) {
      swiperRef.current?.scrollBy(1);
    } else {
      router.replace("/(auth)/sign-up");
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#f0f4f8",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {/* Skip Button */}
      <TouchableOpacity
        onPress={() => router.replace("/(auth)/sign-up")}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 10,
          padding: 10,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: "black" }}>
          Skip
        </Text>
      </TouchableOpacity>

      {/* Swiper */}
      <Swiper
        ref={swiperRef}
        loop={false}
        showsPagination={true}
        dot={
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "black",
              margin: 4,
            }}
          />
        }
        activeDot={
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "#0286FF",
              margin: 4,
            }}
          />
        }
        onIndexChanged={(index) => setActiveIndex(index)}
      >
        {onboarding.map((item) => (
          <View
            key={item.id}
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
          >
            <Image
              source={item.image}
              style={styles.image}
              resizeMode="contain"
            />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        ))}
      </Swiper>

      {/* Next / Get Started Button */}
      <CustomButton
        title={activeIndex === onboarding.length - 1 ? "Get Started" : "Next"}
        onPress={goToNextSlide}
        customStyle={{ marginBottom: 30 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  image: {
    width: 250,
    height: 250,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
  },
});

export default Onboarding;
