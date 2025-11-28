/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import react from '@vitejs/plugin-react';
import path from "path";
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    sourcemap: true,
    outDir: './dist',
    minify: false,
    emptyOutDir: true,
    rollupOptions: {
      external: ["react", "react-dom"],
    },
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
  },
  resolve: {
    alias: {
      // Cross-package aliases (external dependencies)
      '@netcracker/qubership-apihub-api-state-model': path.resolve(__dirname, '../api-state-model/src'),
      '@netcracker/qubership-apihub-api-data-model': path.resolve(__dirname, '../api-data-model/src'),

      // Internal aliases (within this package)
      '@apihub/builders': path.resolve(__dirname, 'src/builders'),
      '@apihub/components': path.resolve(__dirname, 'src/components'),
      '@apihub/constants': path.resolve(__dirname, 'src/consts'),
      '@apihub/contexts': path.resolve(__dirname, 'src/contexts'),
      '@apihub/hooks': path.resolve(__dirname, 'src/hooks'),
      '@apihub/types': path.resolve(__dirname, 'src/types'),
      '@apihub/utils': path.resolve(__dirname, 'src/utils')
    }
  }
})
