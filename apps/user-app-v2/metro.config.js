const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration — standalone app (NOT a monorepo workspace member).
 *
 * Resolve and watch ONLY this app's own node_modules. Do not reach into the
 * monorepo root: that previously let Metro resolve a second react-native-worklets
 * copy and crash the app on worklet use.
 *
 * Exclude native build output dirs from the file map. Gradle creates and deletes
 * intermediate dirs (android/build/intermediates/...) during a build; Metro's
 * fallback file watcher (used when Watchman isn't installed) throws ENOENT and
 * crashes when a watched dir disappears mid-build.
 *
 * https://reactnative.dev/docs/metro
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;

const config = {
  resolver: {
    unstable_enableSymlinks: true,
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules')],
    blockList: [
      /.*\/android\/build\/.*/,
      /.*\/android\/\.cxx\/.*/,
      /.*\/android\/\.gradle\/.*/,
      /.*\/ios\/build\/.*/,
      /.*\/ios\/Pods\/.*/,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
