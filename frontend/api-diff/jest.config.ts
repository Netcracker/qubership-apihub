module.exports = {
  testEnvironment: 'node',
  testTimeout: 100000,
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
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
  // moduleNameMapper: {
  //    "^@netcracker/qubership-apihub-api-unifier$":'<rootDir>/../qubership-apihub-api-unifier/src',
  //    "^@netcracker/qubership-apihub-json-crawl$":'<rootDir>/../qubership-apihub-json-crawl/src',
  //    "^@netcracker/qubership-apihub-graphapi$":'<rootDir>/../qubership-apihub-graphapi/src',
  //    "^@netcracker/qubership-apihub-compatibility-suites$":'<rootDir>/../apihub-compatibility-suites/generation/suite-service',
  // },
  setupFilesAfterEnv: ['jest-extended/all'],
}
