import * as path from 'path'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import target from 'vite-plugin-target'

export default defineConfig({
  plugins: [
    target({
      node: {},
    }),
    viteSingleFile(),
  ],
  esbuild: {
    supported: {
      'top-level-await': true,
    },
  },
  build: {
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    target: 'esnext',
    lib: {
      fileName: (format) => `index.${format}.mjs`,
      entry: path.resolve(__dirname, 'test/performance.ts'),
      formats: ['es'],
    },
  },
})
