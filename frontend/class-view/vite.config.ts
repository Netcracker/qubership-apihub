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
import ts from 'typescript'
import dts from 'vite-plugin-dts'

/* The aliases are defined once, in tsconfig.json "paths"; tsc reads them there, the screenshot
   suite's jest config derives its moduleNameMapper from them, and this builds vite's alias table
   from them. The table is built when the config loads, so it stays a static resolve.alias:
   vite-plugin-dts uses that table to rewrite every alias in the emitted declarations back to a
   relative path, and the published .d.ts must not contain a main/... specifier, which no consumer
   can resolve. A "paths" key "x/*" with target "./dir/*" becomes the alias "x" -> <package>/dir;
   vite matches it as "x" itself or "x/" followed by a path, the same prefix "x/*" matches. */
function aliasesFromTsconfig(): Record<string, string> {
  const { config, error } = ts.readConfigFile(resolve(__dirname, 'tsconfig.json'), ts.sys.readFile)
  if (error) {
    throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'))
  }
  const aliases: Record<string, string> = {}
  for (const [key, targets] of Object.entries<string[]>(config.compilerOptions.paths)) {
    const find = key.replace(/\/\*$/, '')
    const replacement = resolve(__dirname, targets[0].replace(/\/\*$/, ''))
    if (aliases[find] && aliases[find] !== replacement) {
      throw new Error(`tsconfig.json paths map ${find} to two directories: ${aliases[find]} and ${replacement}`)
    }
    aliases[find] = replacement
  }
  return aliases
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    resolve: {
      alias: aliasesFromTsconfig(),
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
      // The compiler rootDir is the package root so that src/it and src/stories are
      // inside it; entryRoot keeps the emitted declarations flat under dist/, which is
      // where the published `types` entry points.
      entryRoot: './src/main',
    })],
  }
})
