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
        main: resolve(__dirname, 'index.html')
      },
      output: {
        // Мы убрали папку 'src/' из путей генерации файлов.
        // Теперь файлы будут лежать прямо в корне папки dist, как того требует manifest.json
        entryFileNames: `[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `[name].[ext]`,
      },
    },
  },
})