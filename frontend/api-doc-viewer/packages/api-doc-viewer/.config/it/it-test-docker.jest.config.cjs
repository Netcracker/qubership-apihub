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

const path = require('path')
const { prepareJestConfig } = require('@netcracker/qubership-apihub-jest-chrome-in-docker-environment')

module.exports = prepareJestConfig(
  path.resolve(__dirname, './common-it-test.jest.config.cjs'),
  path.resolve(__dirname, './common-puppeteer.config.cjs'),
  {
    dockerImage: 'ghcr.io/netcracker/qubership-apihub-nodejs-dev-image:1.8.0',
  },
)
