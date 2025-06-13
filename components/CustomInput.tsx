import React from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const CustomInput = ({ IconLeft, label, style, ...props }) => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardView}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inputWrapper}>
          {label && <Text style={styles.label}>{label}</Text>}
          <View>
            {IconLeft && <View style={styles.iconWrapper}>{IconLeft}</View>}
            <TextInput
              {...props}
              style={[
                styles.input,
                IconLeft ? { paddingLeft: 40 } : null,
                style,
              ]}
              placeholderTextColor="#666"
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    width: "100%",
    flex: 1,
  },
  inputWrapper: {
    marginBottom: 15,
    position: "relative",
    justifyContent: "center",
  },
  label: {
    marginBottom: 5,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  iconWrapper: {
    position: "absolute",
    left: 12,
    top: 13,
    zIndex: 1,
  },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: "#f9f9f9",
    fontSize: 16,
  },
});

export default CustomInput;
