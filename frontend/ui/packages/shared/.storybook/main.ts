// This file has been automatically migrated to valid ESM format by Storybook.
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
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

import type { StorybookConfig } from '@storybook/react-vite'

import { dirname, join, resolve } from 'path'
import { mergeConfig } from 'vite'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')))
}

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
    '../../{portal,agents}/src/**/*.mdx',
    '../../{portal,agents}/src/**/*.stories.@(js|jsx|ts|tsx)',
  ],

  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-onboarding'),
    getAbsolutePath("@storybook/addon-docs")
  ],

  staticDirs: [{ from: '../src/stories/assets', to: '/assets' }],

  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },

  core: {
    disableTelemetry: true,
  },

  viteFinal: (config) => {
    return mergeConfig(config, {
      define: {
        'process.env': {},
      },
      resolve: {
        /* Array form because the icons entry matches on a pattern, which the
           object form cannot express. */
        alias: [
          { find: '@netcracker/qubership-apihub-ui-shared', replacement: resolve(__dirname, '../src') },
          { find: '@netcracker/qubership-apihub-ui-portal', replacement: resolve(__dirname, '../../portal') },
          { find: '@netcracker/qubership-apihub-ui-agents', replacement: resolve(__dirname, '../../agents') },
          // Alias @asyncapi/parser to empty module to prevent bundling Node.js-only code
          { find: '@asyncapi/parser', replacement: resolve(__dirname, '../src/utils/asyncapi-parser-stub.ts') },
          {
            /* Same fix as packages/portal and packages/agents, repeated because this
               is a separate vite build with its own config. Storybook bundles the
               stories of all three packages - see `stories` above - so all 91 files
               with deep @mui/icons-material imports come through here. Without it the
               published showcase throws React error #130 on every icon: rolldown
               applies Node CommonJS interop, the icon arrives as { default: icon },
               and styled() renders the wrapper object. The build stays green either
               way, which is why item 1.12 requires loading the artifact. */
            find: /^@mui\/icons-material\/(?!esm\/)(.+)$/,
            replacement: '@mui/icons-material/esm/$1',
          },
        ],
      },
    })
  }
}
export default config
