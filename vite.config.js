import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: 'all',
    cors: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] }
      }
    }
  }
})
