/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@netcracker/qubership-apihub-ddlapi$': '<rootDir>/src/index.ts',
  },
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
