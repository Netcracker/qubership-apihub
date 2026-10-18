module.exports = {
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
  //   "^@netcracker/qubership-apihub-json-crawl$":'<rootDir>/../qubership-apihub-json-crawl/src',
  //   "^@netcracker/qubership-apihub-graphapi$":'<rootDir>/../qubership-apihub-graphapi/src',
  //   "^@netcracker/qubership-apihub-api-unifier$":'<rootDir>/../qubership-apihub-api-unifier/src',
  //   "^@netcracker/qubership-apihub-api-diff$":'<rootDir>/../qubership-apihub-api-diff/src',
  // },
  moduleNameMapper: {
    "^@apihub/api-data-model/abstract-model$": "<rootDir>/src/abstract",
    "^@apihub/api-data-model/abstract-model/(.*)$": "<rootDir>/src/abstract/$1",
    "^@apihub/api-data-model/graph-api-model$": "<rootDir>/src/graph-api",
    "^@apihub/api-data-model/graph-api-model/(.*)$": "<rootDir>/src/graph-api/$1",
    "^@apihub/api-data-model/json-schema-model$": "<rootDir>/src/json-schema",
    "^@apihub/api-data-model/json-schema-model/(.*)$": "<rootDir>/src/json-schema/$1",
    "^@apihub/api-data-model$": "<rootDir>/src",
    "^@apihub/api-data-model/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverage: true,
}