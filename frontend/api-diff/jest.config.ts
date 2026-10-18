module.exports = {
  testEnvironment: 'node',
  testTimeout: 100000,
  transform: {
    '^.+\\.tsx?$': ['ts-jest'],
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/',
  ],
  testRegex: '(/test/.*(\\.|/)(test|spec))\\.(ts?|tsx?|js?|jsx?)$',
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
  setupFilesAfterEnv: [
    'jest-extended/all',
    '<rootDir>/test/setup/jest-wrappers.ts',
  ],
}
