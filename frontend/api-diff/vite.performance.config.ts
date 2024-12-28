import * as path from 'path'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      fileName: (format) => `index.${format}.mjs`,
      entry: path.resolve(__dirname, 'test/performance.base.ts'),
      formats: ['es'],
    },
  },
})
