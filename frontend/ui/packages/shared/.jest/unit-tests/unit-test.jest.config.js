import path from 'path'
import { fileURLToPath } from 'url'
import ts from 'typescript'
import { pathsToModuleNameMapper } from 'ts-jest'

// This suite runs the tests of all three packages (see `roots` below), so it has to resolve
// each package's own aliases. Those aliases are already declared in each package's tsconfig
// and in its vite config; restating them a third time here is what item 1.9 exists to stop.
//
// Derived rather than restated, because the hand-written version was wrong twice: it was
// missing an entry when portal's imports first moved onto `@apihub/*`, and then carried one
// that sent agents' imports into portal. Neither errored - a moduleNameMapper that disagrees
// with the compiler resolves somewhere else, or nowhere, while tsc stays green.
//
// ts.readConfigFile, not a JSON import: these tsconfigs carry comments added during the
// TypeScript 6 migration, and JSON.parse rejects them.
const here = path.dirname(fileURLToPath(import.meta.url))
const packages = path.resolve(here, '../../..')

const pathsOf = (pkg) => {
  const { config } = ts.readConfigFile(path.join(packages, pkg, 'tsconfig.json'), ts.sys.readFile)
  return (config?.compilerOptions ?? {}).paths ?? {}
}

export default {
  testRunner: 'jest-circus/runner',
  testMatch: ['**/*.unit.test.ts'],
  rootDir: '../..',
  roots: ['<rootDir>/src', '<rootDir>/../portal/src', '<rootDir>/../agents/src'],
  testEnvironment: 'node',
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'json',
    'node',
  ],
  transform: {
    '\\.tsx?$': [
      'ts-jest',
      { tsconfig: '<rootDir>/.jest/unit-tests/tsconfig.unit-test.json' },
    ],
  },
  moduleNameMapper: {
    // Each package's paths are relative to its own directory, so each needs its own prefix.
    // Both declare `@netcracker/qubership-apihub-ui-shared`; the two resolve to the same
    // place, so whichever wins the key collision is correct.
    ...pathsToModuleNameMapper(pathsOf('portal'), { prefix: '<rootDir>/../portal/' }),
    ...pathsToModuleNameMapper(pathsOf('agents'), { prefix: '<rootDir>/../agents/' }),
    // Not an alias - a genuine substitution, so it stays hand-written. jest leaves the ES modules of
    // node_modules untransformed, so `lodash-es` and each of its subpaths go to the CommonJS `lodash`,
    // which has the same helpers under the same paths. `ui-shared` does not declare `lodash`, so jest
    // resolves it only because pnpm hoists the copy of the Portal into node_modules/.pnpm/node_modules:
    // once no package depends on `lodash`, this mapping breaks.
    // TODO(ui): move every package from `lodash` to `lodash-es`, and let jest transform `lodash-es`
    // through `transformIgnorePatterns` instead of mapping it to `lodash`.
    '^lodash-es(/.*)?$': 'lodash$1',
  },
  modulePaths: ['<rootDir>/src', '<rootDir>/../portal/src'],
  reporters: [
    'default',
  ],
  collectCoverage: true,
  coverageReporters: ['text'],
}
