// Lets Node import the TypeScript case builders of packages/samples/src/, which the stories import through Vite.
// Node cannot load them as they are: they import relative files without an extension and import types as values.
// The hooks resolve "./name" to "./name.ts" and compile .ts files with the TypeScript compiler of the workspace,
// which removes the type-only imports. Needs Node.js 22.15 or later (module.registerHooks).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire, registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'
import { VIEWER_PACKAGE } from './lib.mjs'

const ts = createRequire(path.join(VIEWER_PACKAGE, 'package.json'))('typescript')

let registered = false

export function registerTypeScriptHooks() {
  if (registered) return
  registered = true
  registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context)
      } catch (error) {
        const isRelative = specifier.startsWith('./') || specifier.startsWith('../')
        if (error?.code === 'ERR_MODULE_NOT_FOUND' && isRelative && context.parentURL?.endsWith('.ts')) {
          return nextResolve(`${specifier}.ts`, context)
        }
        throw error
      }
    },
    load(url, context, nextLoad) {
      if (!url.endsWith('.ts')) return nextLoad(url, context)
      const source = fs.readFileSync(fileURLToPath(url), 'utf8')
      const { outputText } = ts.transpileModule(source, {
        fileName: fileURLToPath(url),
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      })
      return { format: 'module', source: outputText, shortCircuit: true }
    },
  })
}
