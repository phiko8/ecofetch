import { images } from "@/constants";
import React from "react";
import { Image, StyleProp, ImageStyle } from "react-native";

interface Props {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

/**
 * Eco Fetch brand logo — use `size` to adjust per-page.
 * Source is always `images.bin2` from constants.
 */
const AppLogo = ({ size = 36, style }: Props) => (
  <Image
    source={images.bin2}
    style={[{ width: size, height: size, resizeMode: "contain" }, style]}
    accessibilityLabel="Eco Fetch logo"
  />
);

export default AppLogo;
