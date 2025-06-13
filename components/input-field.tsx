// components/InputField.tsx

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

interface InputFieldProps extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap; // icon name from Ionicons
}

const InputField: React.FC<InputFieldProps> = ({ label, icon, ...inputProps }) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        {icon && <Ionicons name={icon} size={20} color="#666" style={styles.icon} />}
        <TextInput
          style={styles.input}
          placeholderTextColor="#999"
          {...inputProps}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    marginBottom: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#f9f9f9",
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
});

export default InputField;
