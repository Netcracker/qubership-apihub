module.exports = {
  setupFilesAfterEnv: ['jest-extended/all'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/tests/.*|(\\.|/)(test|spec))\\.(ts?|tsx?|js?|jsx?)$',
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
  // "^@netcracker/qubership-apihub-json-crawl$":'<rootDir>/../qubership-apihub-json-crawl/src',
  // "^@netcracker/qubership-apihub-graphapi$":'<rootDir>/../qubership-apihub-graphapi/src',
  // },
  collectCoverage: true,
}
