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
    return mergeConfig(config, {
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

export default config;

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, "package.json")));
}
