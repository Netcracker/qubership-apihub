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

import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    resolve: {
      alias: {
        'assets': resolve(__dirname, './src/assets'),
        'main': resolve(__dirname, './src/main'),
        'stories': resolve(__dirname, './src/stories'),
      },
    },
    build: {
      lib: {
        entry: resolve(__dirname, './src/main/index.ts'),
        name: 'web-components',
        formats: ['es', 'cjs'],
        fileName: (format) => `index.${format}.js`,
      },
    },
    plugins: [dts({
      include: './src/main/**',
    })],
  }
})
