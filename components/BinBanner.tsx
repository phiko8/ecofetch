import bin2 from "@/assets/images/bin2.png";
import React from "react";
import { Dimensions, Image, StyleSheet, Text, View } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// The image is roughly square. With resizeMode: contain inside a 130px tall
// full-width container, it renders as ~130x130 and is centered horizontally.
// The O circle centre sits at ~80% x, ~84% y of the image.
const IMG_SIZE = 130;
const IMG_LEFT = (SCREEN_WIDTH - IMG_SIZE) / 2;

const O_CENTER_X = IMG_LEFT + IMG_SIZE * 0.80;   // px from container left
const O_CENTER_Y = IMG_SIZE * 0.84;               // px from container top

const BinBanner = ({ children }: { children?: React.ReactNode }) => (
  <View style={styles.banner}>
    <Image source={bin2} style={styles.image} />

    {/* "fetch" overlaid inside the O circle */}
    <View
      style={[
        styles.fetchWrap,
        {
          left: O_CENTER_X - 18,   // centre the label (approx half of ~36px label width)
          top:  O_CENTER_Y - 7,    // centre vertically (approx half of ~14px font)
        },
      ]}
    >
      <Text style={styles.fetchText} allowFontScaling={false}>
        fetch
      </Text>
    </View>

    {children}
  </View>
);

const styles = StyleSheet.create({
  banner: {
    width: "100%",
    height: IMG_SIZE,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  fetchWrap: {
    position: "absolute",
  },
  fetchText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#145a1e",
    letterSpacing: 0.5,
  },
});

export default BinBanner;
