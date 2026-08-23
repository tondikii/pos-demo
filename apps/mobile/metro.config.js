const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')
const fs = require('fs')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.disableHierarchicalLookup = false
// wa-sqlite (expo-sqlite web) meng-import file .wasm — Metro default
// tidak mengenali ekstensi ini sebagai asset.
config.resolver.assetExts = [...(config.resolver.assetExts ?? []), 'wasm']

/* ------------------------------------------------------------------ */
/* Patch expo-sqlite web (WorkerChannel) — bug panjang hasil sync      */
/*                                                                     */
/* `sendWorkerResult` menulis panjang hasil via                        */
/* `resultArray.set(new Uint32Array([length]), 0)` — TypedArray.set    */
/* menyalin ELEMENT-WISE (1 byte), jadi length > 255 ter-truncate →    */
/* "Unexpected end of JSON input" di expo web. Fix: tulis 4 byte       */
/* little-endian manual. Patch di-generate dari sumber asli tiap       */
/* server start (project-owned, tidak ubah node_modules).              */
/* ------------------------------------------------------------------ */
const SQLITE_WEB_PATCH_PATH = path.join(projectRoot, 'patches/expo-sqlite-web/WorkerChannel.ts')

function ensureSqliteWorkerChannelPatch() {
  const link = path.join(projectRoot, 'node_modules/expo-sqlite')
  const pkgDir = fs.existsSync(link) ? fs.realpathSync(link) : link
  const webDir = path.join(pkgDir, 'web')
  const src = fs.readFileSync(path.join(webDir, 'WorkerChannel.ts'), 'utf8')

  // Import relatif diganti bare specifier 'expo-sqlite/web/...' — Metro
  // me-resolve lewat nodeModulesPaths (symlink), tidak perlu absolut path.
  const fixed = src
    .replace("import { Deferred } from './Deferred';", "import { Deferred } from 'expo-sqlite/web/Deferred';")
    .replace(
      "import { serialize, deserialize } from './SyncSerializer';",
      "import { serialize, deserialize } from 'expo-sqlite/web/SyncSerializer';",
    )
    .replace(
      "} from './web.types';",
      "} from 'expo-sqlite/web/web.types';",
    )
    .replace(
      'resultArray.set(new Uint32Array([length]), 0);',
      'resultArray[0] = length & 0xff;\n      resultArray[1] = (length >> 8) & 0xff;\n      resultArray[2] = (length >> 16) & 0xff;\n      resultArray[3] = (length >>> 24) & 0xff;',
    )
    .replace(
      '// Copyright 2015-present 650 Industries. All rights reserved.',
      '// Copyright 2015-present 650 Industries. All rights reserved.\n// [LarisPOS patch] fix: tulis panjang hasil sync sebagai 4 byte little-endian (bug length > 255 di expo-sqlite web).',
    )
  fs.mkdirSync(path.dirname(SQLITE_WEB_PATCH_PATH), { recursive: true })
  fs.writeFileSync(SQLITE_WEB_PATCH_PATH, fixed)
  return fixed !== src
}

ensureSqliteWorkerChannelPatch()

const defaultResolver = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Import di SQLiteModule.ts bersifat RELATIF ('./WorkerChannel'); intercept
  // berdasarkan origin module (web/SQLiteModule.ts di paket expo-sqlite).
  const origin = String(context.originModulePath ?? '')
  const isSqliteWebModule = origin.includes('expo-sqlite') && /[\\/]web[\\/]/.test(origin)
  if (isSqliteWebModule && (moduleName === './WorkerChannel' || moduleName === 'expo-sqlite/web/WorkerChannel')) {
    return { type: 'sourceFile', filePath: SQLITE_WEB_PATCH_PATH }
  }
  return defaultResolver
    ? defaultResolver(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform)
}

// Cross-origin isolation (COOP/COEP) — WAJIB untuk expo-sqlite di web:
// openDatabaseSync memakai SharedArrayBuffer + Atomics (wa-sqlite), yang
// hanya tersedia di halaman cross-origin isolated. Expo dev server tidak
// menyetel header ini secara default.
config.server = config.server ?? {}
const userEnhance = config.server.enhanceMiddleware
config.server.enhanceMiddleware = (metroMiddleware, server) => {
  const next = userEnhance ? userEnhance(metroMiddleware, server) : metroMiddleware
  return (req, res, nextMiddleware) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
    return next(req, res, nextMiddleware)
  }
}

module.exports = withNativeWind(config, { input: './global.css' })