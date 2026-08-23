/**
 * `bun run dev:web` — Expo dev server web LarisPOS dengan cross-origin isolation.
 *
 * Kenapa perlu: expo-sqlite di web memakai wa-sqlite lewat Worker +
 * SharedArrayBuffer + Atomics (`openDatabaseSync`), dan SharedArrayBuffer
 * HANYA tersedia di halaman cross-origin isolated (COOP: same-origin +
 * COEP: require-corp). `expo start` TIDAK menyetel header ini secara default,
 * dan `<meta http-equiv>` untuk COEP tidak dihormati browser — jadi header
 * dipasang di level HTTP server (patch tipis pada ManifestMiddleware yang
 * melayani HTML web).
 *
 * Penggunaan: `bun run dev:web` (setara `expo start --web --port 19006`).
 * Native tetap pakai `bun run dev` / `expo start` biasa (tanpa header).
 */
const path = require('path')
const { createRequire } = require('module')

// Resolusi @expo/cli lewat dependency `expo` (hoisted di node_modules/.bun)
// supaya tidak bergantung lokasi install bun.
const projectRoot = path.resolve(__dirname, '..')
const req = createRequire(path.join(projectRoot, 'package.json'))
const expoDir = path.dirname(req.resolve('expo/package.json'))
const cliRoot = path.dirname(req.resolve('@expo/cli/package.json', { paths: [expoDir] }))

const { startAsync } = require(path.join(cliRoot, 'build/src/start/startAsync'))
const { ManifestMiddleware } = require(
  path.join(cliRoot, 'build/src/start/server/middleware/ManifestMiddleware'),
)

const originalHandleWeb = ManifestMiddleware.prototype.handleWebRequestAsync
ManifestMiddleware.prototype.handleWebRequestAsync = function handleWebRequestWithIsolation(req, res) {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
  return originalHandleWeb.call(this, req, res)
}

const options = {
  privateKeyPath: null,
  android: false,
  web: true,
  ios: false,
  offline: false,
  clear: false,
  dev: true,
  https: false,
  maxWorkers: undefined,
  port: 19006,
  minify: false,
  devClient: false,
  scheme: null,
  host: undefined,
}

// `webOnly` sengaja false — sama seperti CLI (`expo start --web`): dengan
// metro web bundler, port web di-resolve lewat jalur metroPort (19006).
startAsync(projectRoot, options, { webOnly: false }).catch((err) => {
  console.error(err)
  process.exit(1)
})