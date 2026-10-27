import type { Plugin } from 'vite'
import type { BuildIdOptions } from './build-id.mjs'

/**
 * Replaces the import of the package's own `package.json` with a module that exports the stamped version:
 * `export const version = '<version>+<build id>'`.
 *
 * @param packageDir The directory of the package whose `package.json` is replaced.
 */
export function stampedVersionPlugin(packageDir: string, options?: BuildIdOptions): Plugin
