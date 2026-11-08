import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rolldownOptions: {
      output: {
        // The classic Bergamot worker resolves its WASM and glue relative to itself.
        assetFileNames(asset) {
          return asset.originalFileNames.some((name) => name.includes('@browsermt/bergamot-translator/worker/'))
            ? 'assets/bergamot-0.4.9/[name][extname]'
            : 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
