const ts = require('typescript')
const { pathsToModuleNameMapper } = require('ts-jest')

// Derive the module mapping from the tsconfig rather than restating it here. The two
// drifted apart across the fleet, and a jest mapping that disagrees with the compiler
// does not error - it resolves somewhere else, or nowhere, while tsc stays green.
//
// ts.readConfigFile, not require(): these tsconfigs carry comments explaining the
// TypeScript 6 migration, and JSON.parse rejects them.
const { config } = ts.readConfigFile('./tsconfig.test.json', ts.sys.readFile)

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: pathsToModuleNameMapper(config.compilerOptions.paths, { prefix: '<rootDir>/' }),
  // pgsql-parser initialises a libpg-query WASM instance per Jest worker
  // process, and that WASM instance cannot be torn down programmatically.  With
  // the default worker pool each worker fails to exit within jest-worker's
  // 500 ms graceful-shutdown window, producing:
  //   "A worker process has failed to exit gracefully and has been force exited."
  //
  // maxWorkers: 1 avoids the problem entirely: the single worker is recycled
  // once and exits cleanly.  It is also faster here because WASM initialisation
  // is paid once and shared across all test-file runs.
  maxWorkers: 1,
}
