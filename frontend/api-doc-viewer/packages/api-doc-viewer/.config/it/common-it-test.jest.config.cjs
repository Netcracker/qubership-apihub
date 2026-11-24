module.exports = {
  rootDir: '../..',
  testMatch: ['**/*.it-test.ts'],
  roots: [
    '<rootDir>/src/it',
  ],
  setupFilesAfterEnv: ['<rootDir>/.jest/setup.tests.ts'],
  transform: {
    '\\.ts?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  reporters: [
    'default',
  ],
}
