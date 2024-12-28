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
      fileName: (format) => `index.${format}.js`,
      entry: path.resolve(__dirname, 'test/performance.ts'),
      formats: ['es'],
    },
  },
})
