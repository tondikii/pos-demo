export default {
  expo: {
    name: 'LarisPOS Kasir',
    slug: 'larispos-kasir',
    scheme: 'larispos',
    platforms: ['android', 'web'],
    userInterfaceStyle: 'light',
    android: { package: 'id.larispos.kasir' },
    web: {
      bundler: 'metro',
      output: 'single',
    },
    plugins: ['expo-router', 'expo-secure-store', 'expo-sqlite'],
  },
}