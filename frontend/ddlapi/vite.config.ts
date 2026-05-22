import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'QupershipApihubDbSchema',
      fileName: (format) => format === 'es' ? 'index.js' : 'index.cjs',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [],
    },
    sourcemap: true,
  },
  plugins: [
    dts({
      include: ['src/**/*'],
      insertTypesEntry: true,
    }),
  ],
})
