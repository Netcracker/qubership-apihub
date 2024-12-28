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
const fs = require('fs')
const teardownPuppeteer = require('jest-environment-puppeteer/teardown')
const { dockerShutdownChromium } = require('docker-chromium')

module.exports = async function globalTeardown(jestConfig) {
  await teardownPuppeteer(jestConfig)

  // shut down Docker container
  await dockerShutdownChromium()

  // delete websocket from file for next time we run test suites
  const endpointPath = path.join(__dirname, 'wsEndpoint')
  fs.writeFileSync(endpointPath, '', { encoding: 'utf8' })
}
