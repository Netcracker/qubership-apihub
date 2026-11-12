module.exports = {
  testEnvironment: 'node',
  testTimeout: 100000,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/.jest/tsconfig.spec.json',
    }],
    'node_modules/@sindresorhus/slugify/.+\\.js?$': 'ts-jest',
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/',
    'node_modules/@sindresorhus/(?!slugify/.*)',
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
  setupFilesAfterEnv: ['jest-extended/all'],
}
