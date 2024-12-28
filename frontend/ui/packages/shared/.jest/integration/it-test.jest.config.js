/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

process.env.JEST_PUPPETEER_CONFIG = '.jest/integration/puppeteer.config.cjs'

export default {
  preset: 'jest-puppeteer',
  testRunner: 'jest-circus/runner',
  testMatch: ['**/*.it-test.ts'],
  rootDir: '../..',
  roots: ['<rootDir>/src/it'],
  globalSetup: 'jest-environment-puppeteer/setup',
  globalTeardown: 'jest-environment-puppeteer/teardown',
  testEnvironment: 'jest-environment-puppeteer',
  setupFilesAfterEnv: ['<rootDir>/.jest/integration/setup.it-test.ts'],
  moduleFileExtensions: [
    'ts',
    'js',
    'json',
    'node'
  ],
  transform: {
    '\\.ts?$': [
      'ts-jest', { tsconfig: '<rootDir>/.jest/integration/tsconfig.it-test.json' }
    ]
  },
  reporters: [
    'default', 'jest-image-snapshot-diff-reporter'
  ]
}
