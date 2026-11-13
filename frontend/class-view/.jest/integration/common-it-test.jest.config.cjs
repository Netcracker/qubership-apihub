const { pathsToModuleNameMapper } = require('ts-jest')
const ts = require('typescript')

// Derive the mapping from the package tsconfig rather than restating it, so an alias import
// that tsc and vite resolve also resolves here. ts.readConfigFile, not require(): the file
// may carry comments, which JSON.parse rejects.
const { config } = ts.readConfigFile(require.resolve('../../tsconfig.json'), ts.sys.readFile)

module.exports = {
  rootDir: '../..',
  moduleNameMapper: pathsToModuleNameMapper(config.compilerOptions.paths, { prefix: '<rootDir>/' }),
  testMatch: ['**/*.it-test.ts'],
  roots: ['<rootDir>/src/it'],
  setupFilesAfterEnv: ['<rootDir>/.jest/integration/setup.it-test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '\\.ts?$': [
      'ts-jest', { tsconfig: '<rootDir>/.jest/integration/tsconfig.it-test.json' }
    ]
  },
}
