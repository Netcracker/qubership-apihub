export default {
  testRunner: 'jest-circus/runner',
  testMatch: ['**/*.unit-test.ts'],
  rootDir: '../..',
  roots: ['<rootDir>/src/it/unit-tests'],
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
  reporters: [
    'default',
  ],
  collectCoverage: true,
  coverageReporters: ['text'],
} 