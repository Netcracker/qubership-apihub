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
import { defineConfig, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';
import ts from 'typescript';

/* The aliases are defined once, in tsconfig.json "paths"; tsc reads them there, jest.config.ts
   derives its moduleNameMapper from them, and this builds vite's alias table from them. The table
   is built when the config loads, so it stays a static resolve.alias: vite-plugin-dts uses that
   table to rewrite every alias in the emitted declarations back to a relative path, and the
   published .d.ts must not contain an @apihub/... specifier, which no consumer can resolve.
   A "paths" key "@x/*" with target "./dir/*" becomes the alias "@x" -> <package>/dir; vite matches
   it as "@x" itself or "@x/" followed by a path, the same prefix "@x/*" matches in tsconfig. */
function aliasesFromTsconfig(): Record<string, string> {
  const { config, error } = ts.readConfigFile(path.resolve(__dirname, 'tsconfig.json'), ts.sys.readFile)
  if (error) {
    throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'))
  }
  const aliases: Record<string, string> = {}
  for (const [key, targets] of Object.entries<string[]>(config.compilerOptions.paths)) {
    const find = key.replace(/\/\*$/, '')
    const replacement = path.resolve(__dirname, targets[0].replace(/\/\*$/, ''))
    if (aliases[find] && aliases[find] !== replacement) {
      throw new Error(`tsconfig.json paths map ${find} to two directories: ${aliases[find]} and ${replacement}`)
    }
    aliases[find] = replacement
  }
  return aliases
}

const BUNDLED_REACT_MODULE = /\/node_modules\/(react|react-dom)\/|esm-external-require/
const REACT_REQUIRE_CALL = /require\(\s*["']react(-dom)?(\/[^"']*)?["']\s*\)/

/* Fails the library build when React is bundled or required at runtime. Only require()
   calls with a literal module name are detected. Storybook loads this config too and
   bundles React on purpose, so the check runs only when build.lib is set. */
function checkReactExternals(): Plugin {
  let isLibraryBuild = false
  return {
    name: 'api-doc-viewer:check-react-externals',
    configResolved(config) {
      isLibraryBuild = Boolean(config.build.lib)
    },
    generateBundle(_, bundle) {
      if (!isLibraryBuild) {
        return
      }
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') {
          continue
        }
        const bundledModule = output.moduleIds.find(id => BUNDLED_REACT_MODULE.test(id.replace(/\\/g, '/')))
        if (bundledModule) {
          this.error(`${output.fileName} bundles ${bundledModule}. Keep React external through build.rolldownOptions.external, not through a plugin.`)
        }
        const requireCall = output.code.match(REACT_REQUIRE_CALL)
        if (requireCall) {
          this.error(`${output.fileName} calls ${requireCall[0]}, which throws in a browser. Make the module that calls it external, or replace it.`)
        }
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
    }),
    checkReactExternals(),
  ],
  build: {
    sourcemap: true,
    outDir: './dist',
    minify: false,
    emptyOutDir: true,
    /* Consumers supply React, so react, react-dom, and their subpaths stay imports. With
       only 'react' external, react/jsx-runtime was bundled as CommonJS, and its
       require('react') reached dist: esmExternalRequirePlugin turned it into
       m['module.exports'], which webpack 5 rejects in apispec-view. Keeping every subpath
       external leaves no such require(), so the plugin is not needed. */
    rolldownOptions: {
      external: /^react(-dom)?(\/.*)?$/,
    },
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
      /* Vite 8 names library CSS after the entry, so this emitted index.css where every
         earlier version emitted style.css. That filename is part of the published
         contract - package.json exports "./dist/style.css", and ui imports it from
         GraphQlOperationViewer.tsx and JsonSchemaViewer.tsx - so it is pinned here
         rather than renamed downstream. */
      cssFileName: 'style',
    },
  },
  resolve: {
    alias: aliasesFromTsconfig(),
  },
})
