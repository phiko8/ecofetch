const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Packages that use native C++/Java code and cannot run on web or in the
// server-side static renderer.  Swap them for empty stubs on web so the
// Expo export build succeeds (the mobile app still uses the real packages).
const NATIVE_ONLY_PACKAGES = [
  'react-native-maps',
  '@stripe/stripe-react-native',
  'react-native-maps-directions',
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    NATIVE_ONLY_PACKAGES.some(
      (pkg) => moduleName === pkg || moduleName.startsWith(pkg + '/'),
    )
  ) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'stubs/empty-native-module.js'),
    };
  }
  // Fall through to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
