import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@core': resolve(__dirname, 'src/core'),
    },
  },
  build: {
    outDir: '.vite/build',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main/index.ts'),
      },
      external: [
        'electron',
        'sql.js',
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
