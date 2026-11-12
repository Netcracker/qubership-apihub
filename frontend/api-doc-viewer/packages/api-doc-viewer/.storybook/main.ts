// This file has been automatically migrated to valid ESM format by Storybook.
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
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
