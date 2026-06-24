import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function syncManifestVersion() {
  const packageJsonPath = resolve(__dirname, 'package.json')
  const manifestPath = resolve(__dirname, 'public/manifest.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    version?: string
  }
  const manifestText = readFileSync(manifestPath, 'utf8')
  const manifest = JSON.parse(manifestText) as {
    version?: string
  }

  if (!packageJson.version) {
    throw new Error('package.json is missing a version field.')
  }

  if (!/^\d+(?:\.\d+){0,3}$/.test(packageJson.version)) {
    throw new Error(
      `package.json version "${packageJson.version}" is not a valid Chrome extension version.`
    )
  }

  if (manifest.version !== packageJson.version) {
    writeFileSync(
      manifestPath,
      manifestText.replace(/("version"\s*:\s*)"[^"]+"/, `$1${JSON.stringify(packageJson.version)}`)
    )
  }
}

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'sync-manifest-version',
      configResolved: syncManifestVersion
    },
    react()
  ],
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        options: resolve(__dirname, 'options.html'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
})
