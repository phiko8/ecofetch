// Web fallback — react-native-maps is not supported on web.
// Metro automatically uses Map.native.tsx on iOS/Android instead of this file.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function Map() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.text}>Map not available on web</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    color: '#6B7280',
  },
});
