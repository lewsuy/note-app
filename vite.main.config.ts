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
      name: 'copy-sql-wasm',
      closeBundle() {
        // Copy the sql.js WASM binary to the build output directory.
        // sql.js uses __dirname at runtime to locate this file.
        const wasmSrc = resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm');
        const wasmDest = resolve(__dirname, '.vite/build/sql-wasm.wasm');
        try {
          copyFileSync(wasmSrc, wasmDest);
          console.log('[copy-sql-wasm] Copied sql-wasm.wasm to build output');
        } catch (err) {
          console.error('[copy-sql-wasm] Failed to copy sql-wasm.wasm:', err);
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
      ],
    },
  },
});
