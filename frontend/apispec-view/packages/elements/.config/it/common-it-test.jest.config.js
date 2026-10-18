/**
 * [Jest Configuration](https://jestjs.io/docs/configuration#projects-arraystring--projectconfig) excluding `globalSetup`, `globalTeardown`, `testEnvironment`, `preset`
 * @type {{rootDir: string, testMatch: string[], roots: string[], setupFilesAfterEnv: string[], transform: {string: string[]}, and_other}}
 *
 * @see qubership-apihub-jest-chrome-in-docker-environment readme
 */
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
