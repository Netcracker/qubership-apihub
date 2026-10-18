// This file has been automatically migrated to valid ESM format by Storybook.
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
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

import type {StorybookConfig} from "@storybook/react-vite";
import { mergeConfig } from "vite";

const require = createRequire(import.meta.url);

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],

  addons: [getAbsolutePath("@storybook/addon-links"), getAbsolutePath("@storybook/addon-docs")],

  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },

  async viteFinal(config) {
    /* Storybook auto-loads this package's own vite.config.ts and MERGES its plugins.
       That config is a *library* build: it externalises react and react-dom through
       rolldown's esmExternalRequirePlugin, so consumers supply their own React rather
       than receiving a second copy bundled in.

       The showcase is the opposite case. It is loaded straight into a browser, which
       has no module resolver, so a bare `import ... from "react"` there is
       `TypeError: Failed to resolve module specifier "react"` - the story tree never
       mounts and every screenshot then fails with `Node has 0 height`.

       Storybook REPLACES build.rollupOptions but MERGES plugins. While react and
       react-dom sat in build.rollupOptions.external there was no leak; moving them
       into a plugin (item 1.11) is precisely what exposed one. So it is stripped here,
       for the showcase only - the library build keeps it. */
    const withoutLibraryExternals = {
      ...config,
      plugins: stripPluginByName(config.plugins, LIBRARY_EXTERNAL_PLUGIN),
    };

    return mergeConfig(withoutLibraryExternals, {
      optimizeDeps: {
        // ddlapi's '/parser' resolves (browser condition) to a self-contained,
        // WASM-inlined bundle — no libpg-query WASM plugins needed. Keep it out of
        // esbuild pre-bundling so the ddl-suite stories' dynamic import stays a
        // lazily-loaded chunk instead of eagerly pulling the ~1.9 MB parser.
        exclude: [
          "@netcracker/qubership-apihub-ddlapi",
        ],
      },
    });
  }
};

/** The name rolldown's esmExternalRequirePlugin identifies itself by. */
const LIBRARY_EXTERNAL_PLUGIN = "builtin:esm-external-require";

/** Vite plugin arrays nest and may contain falsy entries, so this recurses rather
 *  than filtering a single level. */
function stripPluginByName(plugins: any, name: string): any {
  if (Array.isArray(plugins)) {
    return plugins
      .map(p => stripPluginByName(p, name))
      .filter(p => !(p && !Array.isArray(p) && p.name === name));
  }
  return plugins;
}

export default config;

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, "package.json")));
}
