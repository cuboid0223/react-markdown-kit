/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    // .d.ts generation. NOTE: this uses the regular `typescript` package,
    // not tsgo — tsgo does not yet expose a stable compiler API for this.
    dts({
      tsconfigPath: './tsconfig.json',
      include: ['src'],
      // single rolled-up dist/index.d.ts
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      // ESM only — we intentionally do NOT emit a CJS build.
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      // Keep React (peer deps) and react-markdown external so consumers
      // dedupe a single copy.
      external: (id) =>
        id === 'react' ||
        id === 'react-dom' ||
        id.startsWith('react/') ||
        id.startsWith('react-dom/') ||
        id === 'react-markdown',
      output: {
        // emit the css next to the js so consumers can import it
        assetFileNames: 'styles.css',
      },
    },
    sourcemap: true,
    minify: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: true,
  },
});
