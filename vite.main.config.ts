import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@core': resolve(__dirname, 'src/core'),
    },
  },
  plugins: [
    {
      name: 'copy-sql-js',
      closeBundle() {
        const buildDir = resolve(__dirname, '.vite/build');

        // Copy sql-wasm.wasm (WASM binary needed at runtime)
        try {
          copyFileSync(
            resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm'),
            resolve(buildDir, 'sql-wasm.wasm'),
          );
          console.log('[copy-sql-js] Copied sql-wasm.wasm');
        } catch (err) {
          console.error('[copy-sql-js] Failed to copy sql-wasm.wasm:', err);
        }

        // Copy sql-wasm.js (the sql.js module itself, needed at runtime)
        // We copy this because Rollup's CJS transformation corrupts the
        // emscripten UMD wrapper, so we can't bundle it. Instead, we
        // require() it by absolute path at runtime.
        try {
          copyFileSync(
            resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.js'),
            resolve(buildDir, 'sql-wasm.js'),
          );
          console.log('[copy-sql-js] Copied sql-wasm.js');
        } catch (err) {
          console.error('[copy-sql-js] Failed to copy sql-wasm.js:', err);
        }
      },
    },
  ],
  build: {
    outDir: '.vite/build',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main/index.ts'),
      },
      external: [
        'electron',
        'fs',
        'path',
        'os',
        'crypto',
        'node:fs',
        'node:path',
        'node:os',
        'node:crypto',
        'sql.js',
      ],
    },
  },
});
