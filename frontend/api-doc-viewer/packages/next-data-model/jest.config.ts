const { pathsToModuleNameMapper } = require('ts-jest')

// Derive the mapping from the tsconfig rather than restating it. A jest mapping that
// disagrees with the compiler does not error - it resolves somewhere else, or nowhere,
// while tsc stays green.
//
// Plain require() because this tsconfig is plain JSON. If a comment is ever added here,
// jest fails to start with a parse error - loud, and preferable to importing typescript,
// which this package does not declare.
const { compilerOptions } = require('./tsconfig.json')

module.exports = {
  transform: {
    // TypeScript 6 requires rootDir to be explicit once an outDir is in play
    // (TS5011), and ts-jest supplies one. Without it the common source directory
    // is inferred as ./test and every suite fails to compile - which 5.8.2 never
    // reported, so these tests had not been compiled by the fleet baseline until
    // the root declared it. Set here rather than in tsconfig.json: that config
    // describes the library program (include: src), this one the test program,
    // and the tsconfig has to stay comment-free plain JSON for the require above.
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { rootDir: './' } }],
  },
  testRegex: '(/tests/.*\\.(test|spec)|(\\.|/)(test|spec))\\.(ts?|tsx?|js?|jsx?)$',
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
  ],
  // moduleNameMapper:{
  //   "^@netcracker/qubership-apihub-json-crawl$":'<rootDir>/../qubership-apihub-json-crawl/src',
  //   "^@netcracker/qubership-apihub-graphapi$":'<rootDir>/../qubership-apihub-graphapi/src',
  //   "^@netcracker/qubership-apihub-api-unifier$":'<rootDir>/../qubership-apihub-api-unifier/src',
  //   "^@netcracker/qubership-apihub-api-diff$":'<rootDir>/../qubership-apihub-api-diff/src',
  // },
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
  collectCoverage: true,
}