/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  rootDir: '../../',
  testMatch: ['**/src/**/*.unit-test.(ts|tsx)'],
  testEnvironment: 'jsdom',
}
