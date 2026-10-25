import { defineConfig } from 'vite';

// The game is served from https://viibezcoding.github.io/fore/,
// so built asset paths need the /fore/ prefix.
export default defineConfig({
  base: '/fore/',
  build: {
    chunkSizeWarningLimit: 800, // three.js alone is ~530 kB minified
  },
  server: {
    host: true, // also serve on your local network, for testing on a phone
  },
});
