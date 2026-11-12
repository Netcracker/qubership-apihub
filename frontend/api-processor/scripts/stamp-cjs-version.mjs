/**
 * Stamps the CommonJS build with the version from tools/build-id.
 *
 * `tsc` copies package.json to dist/cjs/package.json, and the compiled code reads its version from there
 * (`require('../package.json')`). The UI resolves the package entry and reads the first manifest it finds on the
 * way up, which is the same file. Rewriting its `version` makes the build-task-consumer and the UI report the same
 * stamped string. The ES build is stamped by the plugin in vite.config.ts.
 *
 * Run after `tsc`, before `vite build`.
 */

import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { stampedVersion } from '@netcracker/qubership-apihub-build-id'

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(packageDir, 'dist/cjs/package.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
manifest.version = stampedVersion(packageDir)
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 4)}\n`)
console.log(`dist/cjs/package.json version: ${manifest.version}`)
