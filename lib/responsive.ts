import { Dimensions, PixelRatio } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Base dimensions (iPhone 14 / standard design reference)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/**
 * Scale a size relative to screen width.
 * Use for: widths, horizontal padding/margin, icon sizes.
 */
export const scale = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel((SCREEN_WIDTH / BASE_WIDTH) * size));

/**
 * Scale a size relative to screen height.
 * Use for: heights, vertical padding/margin.
 */
export const vs = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel((SCREEN_HEIGHT / BASE_HEIGHT) * size));

/**
 * Moderate scale — scales less aggressively. Best for font sizes.
 * factor: 0 = no scaling, 1 = full scaling. Default 0.45.
 */
export const ms = (size: number, factor = 0.45): number =>
  Math.round(PixelRatio.roundToNearestPixel(size + (scale(size) - size) * factor));

export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;
