module.exports = {
  preset: '@stoplight/scripts',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/../../setupTests.ts'],
  snapshotSerializers: ['enzyme-to-json/serializer'],
  testMatch: ['<rootDir>/src/**/*.(spec|test).(ts|js)?(x)'],
  coveragePathIgnorePatterns: ['__tests__', '__fixtures__', '__stories__'],
  testTimeout: 10000,
  // An array of directory names to be searched recursively up from the requiring module's location
  moduleDirectories: ['node_modules'],
  moduleNameMapper: {
    '^@stoplight/elements$': '<rootDir>/../elements/src',
    '^@stoplight/elements/(.*)': '<rootDir>/../elements/src/$1',
    '^@stoplight/elements-core$': '<rootDir>/../elements-core/src',
    '^@stoplight/elements-core/(.*)': '<rootDir>/../elements-core/src/$1',
    '^json-schema-viewer$': '<rootDir>/../json-schema-viewer/src',
    '^json-schema-diff-viewer$': '<rootDir>/../json-schema-diff-viewer/src',
  },
};
