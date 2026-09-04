import { ms, scale, vs } from "@/lib/responsive";
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
  style,
  disabled,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, styles[bgVariant], customStyle, style]}
    >
      <View style={styles.content}>
        {IconLeft && <View style={styles.icon}>{IconLeft}</View>}
        <Text style={[styles.text, styles[textVariant]]} allowFontScaling={false}>
          {title}
        </Text>
        {IconRight && <View style={styles.icon}>{IconRight}</View>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: vs(13),
    paddingHorizontal: scale(20),
    borderRadius: scale(20),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  primary: {
    backgroundColor: "#1AB045",
    borderColor: "#1AB045",
  },
  secondary: {
    backgroundColor: "#6c757d",
    borderColor: "#6c757d",
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: "#1AB045",
  },
  smokewhite: {
    backgroundColor: "#F4F4F4",
    borderColor: "#ccc",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontSize: ms(15),
    fontWeight: "600",
  },
  default: {
    color: "#fff",
  },
  muted: {
    color: "#ccc",
  },
  primaryText: {
    color: "#1AB045",
  },
  smokewhiteText: {
    color: "#333",
  },
  icon: {
    marginHorizontal: scale(5),
  },
});

export default CustomButton;
