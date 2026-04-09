module.exports = {
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
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
  moduleNameMapper: {
    "^@apihub/next-data-model/building-service$": "<rootDir>/src/building-service",
    "^@apihub/next-data-model/building-service/(.*)$": "<rootDir>/src/building-service/$1",
    "^@apihub/next-data-model/model$": "<rootDir>/src/model",
    "^@apihub/next-data-model/model/(.*)$": "<rootDir>/src/model/$1",
    "^@apihub/next-data-model$": "<rootDir>/src",
    "^@apihub/next-data-model/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverage: true,
}