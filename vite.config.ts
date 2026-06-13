/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Rollup strips module-level `'use client'` directives when bundling (and warns).
 * With `preserveModules`, each source file becomes its own output file, so we
 * re-attach the directive to exactly the chunks whose source declared it — this
 * is what lets a single `.` entry expose both RSC-safe modules (no directive)
 * and client modules (with directive) under one import path.
 */
function preserveUseClient(): Plugin {
  const clientModules = new Set<string>();
  const hasDirective = /^\s*(['"])use client\1/;
  return {
    name: 'preserve-use-client',
    enforce: 'pre',
    transform(code, id) {
      if (hasDirective.test(code)) clientModules.add(id);
      return null;
    },
    renderChunk(code, chunk) {
      const ids = [chunk.facadeModuleId, ...chunk.moduleIds];
      const isClient = ids.some((id) => id && clientModules.has(id));
      if (isClient && !hasDirective.test(code)) {
        return { code: `'use client';\n${code}`, map: null };
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [react(), preserveUseClient()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      // ESM only — we intentionally do NOT emit a CJS build.
      formats: ['es'],
    },
    rollupOptions: {
      // Keep React (peer deps) and markdown-to-jsx external so consumers
      // dedupe a single copy.
      external: (id) =>
        id === 'react' ||
        id === 'react-dom' ||
        id.startsWith('react/') ||
        id.startsWith('react-dom/') ||
        id === 'markdown-to-jsx' ||
        id.startsWith('markdown-to-jsx/'),
      output: {
        // One output file per source module, preserving `src/` structure, so
        // per-file 'use client' boundaries survive (see preserveUseClient).
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        // emit the css next to the js so consumers can import it
        assetFileNames: 'styles.css',
      },
      // We re-add 'use client' via the plugin above, so silence the warning.
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
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
