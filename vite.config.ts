import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo>/, so build with that base.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/brotac/' : '/',
  build: {
    // three.js alone is ~550 kB minified; not worth warning about.
    chunkSizeWarningLimit: 1000,
  },
}));
