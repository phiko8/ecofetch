import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const CustomButton = ({
  onPress,
  title,
  bgVariant = "primary",
  textVariant = "default",
  IconLeft,
  IconRight,
  customStyle,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, styles[bgVariant], customStyle]}
    >
      <View style={styles.content}>
        {IconLeft && <View style={styles.icon}>{IconLeft}</View>}
        <Text style={[styles.text, styles[textVariant]]}>{title}</Text>
        {IconRight && <View style={styles.icon}>{IconRight}</View>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1, // Border for outline buttons
  },
  primary: {
    backgroundColor: "#1AB045", // Green for primary button
  },
  secondary: {
    backgroundColor: "#6c757d", // Gray for secondary button
  },
  outline: {
    backgroundColor: "transparent", // Transparent for outline button
    borderColor: "#1AB045", // Green border for outline button
  },
  smokewhite: {
    backgroundColor: "#F4F4F4", // Light smokey white color
    borderColor: "#ccc", // Border color to match smokewhite theme
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontSize: 15,
  },
  default: {
    color: "#fff", // Default text color (white)
  },
  muted: {
    color: "#ccc", // Muted text color (gray)
  },
  primaryText: {
    color: "#1AB045", // Green text for primary button
  },
  smokewhiteText: {
    color: "#333", // Dark text for smokewhite button for better contrast
  },
  icon: {
    marginHorizontal: 5,
  },
});

export default CustomButton;
