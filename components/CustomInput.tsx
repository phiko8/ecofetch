import { Ionicons } from "@expo/vector-icons";
import { ms, scale, vs } from "@/lib/responsive";
import React, { ReactNode, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

interface CustomInputProps extends TextInputProps {
  icon?: keyof typeof Ionicons.glyphMap;
  IconLeft?: ReactNode;
  label?: string;
  style?: ViewStyle;
}

const CustomInput = ({ icon, IconLeft, label, style, secureTextEntry, ...props }: CustomInputProps) => {
  const [hidden, setHidden] = useState(true);

  const iconEl = IconLeft ?? (icon ? (
    <Ionicons name={icon} size={scale(18)} color="#9CA3AF" />
  ) : null);

  return (
    <View style={styles.inputWrapper}>
      {label && (
        <Text style={styles.label} allowFontScaling={false}>
          {label}
        </Text>
      )}
      <View>
        {iconEl && <View style={styles.iconWrapper}>{iconEl}</View>}
        <TextInput
          {...props}
          secureTextEntry={secureTextEntry ? hidden : false}
          style={[
            styles.input,
            iconEl ? { paddingLeft: scale(40) } : null,
            secureTextEntry ? { paddingRight: scale(44) } : null,
            style,
          ]}
          placeholderTextColor="#9CA3AF"
          allowFontScaling={false}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.eyeWrapper}
            onPress={() => setHidden((v) => !v)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={hidden ? "eye-off-outline" : "eye-outline"}
              size={scale(20)}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    marginBottom: vs(14),
    position: "relative",
    justifyContent: "center",
  },
  label: {
    marginBottom: vs(5),
    fontSize: ms(14),
    color: "#374151",
    fontWeight: "600",
  },
  iconWrapper: {
    position: "absolute",
    left: scale(12),
    top: vs(14),
    zIndex: 1,
  },
  eyeWrapper: {
    position: "absolute",
    right: scale(12),
    top: vs(14),
    zIndex: 1,
  },
  input: {
    height: vs(50),
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: scale(10),
    paddingHorizontal: scale(15),
    backgroundColor: "#F9FAFB",
    fontSize: ms(15),
    color: "#111",
  },
});

export default CustomInput;
