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

module.exports = {
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'node',
        jsx: 'react-jsx',
      },
    }],
  },
  testRegex: '(/tests/.*\\.(test|spec)|(\\.|/)(test|spec))\\.(ts?|tsx?|js?|jsx?)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    '^@apihub/api-data-model$': '<rootDir>/../api-data-model/src',
    '^@apihub/api-data-model/(.*)$': '<rootDir>/../api-data-model/src/$1',
    '^@apihub/next-data-model$': '<rootDir>/../next-data-model/src',
    '^@apihub/next-data-model/(.*)$': '<rootDir>/../next-data-model/src/$1',
    '^@netcracker/qubership-apihub-api-data-model$': '<rootDir>/../api-data-model/src',
    '^@netcracker/qubership-apihub-api-data-model/(.*)$': '<rootDir>/../api-data-model/src/$1',
    '^@netcracker/qubership-apihub-next-data-model$': '<rootDir>/../next-data-model/src',
    '^@netcracker/qubership-apihub-next-data-model/(.*)$': '<rootDir>/../next-data-model/src/$1',
  },
  testEnvironment: 'node',
}
