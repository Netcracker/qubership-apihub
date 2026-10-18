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
  testMatch: ['**/*.unit-test.ts'],
  rootDir: '../..',
  roots: ['<rootDir>/src', '<rootDir>/../portal/src', '<rootDir>/../agents/src'],
  testEnvironment: 'node',
  moduleFileExtensions: [
    'ts',
    'js',
    'json',
    'node',
  ],
  transform: {
    '\\.ts?$': [
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
    // Not an alias - a genuine substitution, so it stays hand-written. Named as a module
    // rather than as a path: '<rootDir>/../../node_modules/lodash/isPlainObject.js' is
    // correct only while node_modules sits two levels up from this package, which is not
    // true under a workspace or an isolated linker. jest resolves the bare specifier the
    // way the runtime would, and reports it loudly if it cannot.
    '^lodash-es/isPlainObject$': 'lodash/isPlainObject',
  },
  modulePaths: ['<rootDir>/src', '<rootDir>/../portal/src'],
  reporters: [
    'default',
  ],
  collectCoverage: true,
  coverageReporters: ['text'],
}
