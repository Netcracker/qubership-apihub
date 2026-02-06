import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      tsconfigPath: './tsconfig.json',
    }),
  ],
  build: {
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      fileName: (format) => `index.${format}.js`,
      entry: './index.ts',
      formats: ['es', 'cjs'],
    },
  },
})
