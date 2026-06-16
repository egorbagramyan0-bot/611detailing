import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        wash: resolve(__dirname, 'wash.html'),
        polish: resolve(__dirname, 'polish.html'),
        ceramic: resolve(__dirname, 'ceramic.html'),
        wrap: resolve(__dirname, 'wrap.html'),
        'dry-clean': resolve(__dirname, 'dry-clean.html'),
        leather: resolve(__dirname, 'leather.html'),
        prep: resolve(__dirname, 'prep.html'),
      },
    },
  },
});
