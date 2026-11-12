// This package is "type": "module". jest 29 always compiled a .ts config as CommonJS;
// jest 30 honours the package type and loads it as ESM, where `module` is not defined.
import ts from 'typescript'
import { pathsToModuleNameMapper } from 'ts-jest'

// Derive the mapping from the tsconfig rather than restating it. A jest mapping that
// disagrees with the compiler does not error - it resolves somewhere else, or nowhere,
// while tsc stays green.
//
// ts.readConfigFile, not a JSON import: these tsconfigs carry comments from the
// TypeScript 6 migration and JSON.parse rejects them.
const { compilerOptions } = ts.readConfigFile('./tsconfig.json', ts.sys.readFile).config

export default {
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'node',
        jsx: 'react-jsx',
        // TypeScript 6: 'moduleResolution: node' is deprecated (TS5107) but still
        // functional through 6.x, and rootDir must be explicit next to the outDir
        // inherited from the base config (TS5011).
        ignoreDeprecations: '6.0',
        rootDir: './',
      },
    }],
  },
  testRegex: '(/tests/.*\\.(test|spec)|(\\.|/)(test|spec))\\.(ts?|tsx?|js?|jsx?)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
  testEnvironment: 'node',
}
