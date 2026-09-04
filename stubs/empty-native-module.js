// Stub for native-only packages when running on web / server renderer.
// The real packages are used on iOS and Android via metro.config.js.
module.exports = new Proxy({}, {
  get: () => () => null,
});
