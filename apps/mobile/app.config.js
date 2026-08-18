export default {
  expo: {
    name: 'LarisPOS Kasir',
    slug: 'larispos-kasir',
    scheme: 'larispos',
    platforms: ['android'],
    android: { package: 'id.larispos.kasir' },
    plugins: ['expo-router', 'expo-secure-store', 'expo-sqlite'],
  },
}
