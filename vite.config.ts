/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('scale-'),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
  assetsInclude: ['**/*.md'],
  optimizeDeps: {
    // Stencil lazy-loads individual component modules at runtime. Pre-bundling
    // collapses these into opaque chunks, which can cause hydration failures
    // when Vite's dep cache is cleared/rebuilt. Excluding Scale avoids the
    // stale-cache → broken-components cycle entirely.
    exclude: ['@telekom/scale-components'],
  },
  server: {
    proxy: {
      '/api/lmstudio': {
        target: 'http://127.0.0.1:1234',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/lmstudio/, ''),
      },
    },
  },
})
