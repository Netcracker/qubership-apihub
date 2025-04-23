export default {
  testRunner: 'jest-circus/runner',
  testMatch: ['**/*.unit-test.ts'],
  rootDir: '../..',
  roots: ['<rootDir>/src', '<rootDir>/../portal/src', '<rootDir>/../agents/src'],
  testEnvironment: 'node',
  moduleFileExtensions: [
    'ts',
    'js',
    'json',
    'node',
  ],
  transform: {
    '\\.ts?$': [
      'ts-jest', { tsconfig: '<rootDir>/.jest/unit-tests/tsconfig.unit-test.json' },
    ],
  },
  moduleNameMapper: {
    '^@netcracker/qubership-apihub-ui-shared/(.*)$': '<rootDir>/src/$1',
  },
  modulePaths: ['<rootDir>/src', '<rootDir>/../portal/src'],
  reporters: [
    'default',
  ],
  collectCoverage: true,
  coverageReporters: ['text'],
}