import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';

// ESM-safe __dirname replacement
const root = fileURLToPath(new URL('.', import.meta.url));
const src  = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  base: './',

  resolve: {
    alias: {
      '@':         src,
      '@scenes':   fileURLToPath(new URL('./src/scenes',   import.meta.url)),
      '@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
      '@ui':       fileURLToPath(new URL('./src/ui',       import.meta.url)),
      '@utils':    fileURLToPath(new URL('./src/utils',    import.meta.url)),
      '@assets':   fileURLToPath(new URL('./public/assets',import.meta.url)),
    },
  },

  server: {
    host: true,
    port: 3000,
    open: false,   // don't auto-open in sandbox env
  },

  build: {
    target:    'es2017',
    outDir:    'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 2048,
    rollupOptions: {
      input: fileURLToPath(new URL('./index.html', import.meta.url)),
      output: {
        manualChunks:   { phaser: ['phaser'] },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    minify: 'esbuild',
  },

  optimizeDeps: {
    include: ['phaser'],
  },
});
