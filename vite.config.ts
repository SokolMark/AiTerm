import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { cpSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      apply: 'build',
      writeBundle() {
        cpSync(
          resolve(__dirname, 'public', 'manifest.json'),
          resolve(__dirname, 'dist', 'manifest.json')
        )
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: `src/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `src/[name].[ext]`,
      },
    },
  },
})
