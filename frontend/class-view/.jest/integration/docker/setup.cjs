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

const setupPuppeteer = require('jest-environment-puppeteer/setup')
const path = require('path')
const fs = require('fs')
const findNodeModules = require('find-node-modules')
const nodeModulePaths = findNodeModules({ relative: false })
const {
  dockerSetChromiumConfig,
  dockerRunChromium
} = require('docker-chromium')
const { getChromiumRevision } = require('./puppeteer.cjs')

// if user hasn't specified a custom jest puppeteer config path,
// we will look for a config at their package root,
// otherwise use default internal one
if (!process.env.JEST_PUPPETEER_CONFIG) {
  const rootJestPuppeteerConfigPath = path.join(
    nodeModulePaths[0],
    '../',
    'jest-puppeteer.config.cjs'
  )

  if (fs.existsSync(rootJestPuppeteerConfigPath)) {
    process.env.JEST_PUPPETEER_CONFIG = rootJestPuppeteerConfigPath
  } else {
    process.env.JEST_PUPPETEER_CONFIG = path.join(
      __dirname,
      '../',
      'jest-puppeteer.config.cjs'
    )
  }
}

const {
  chromiumFlags,
  downloadHost,
  useClosestUbuntuMirror
} = require(path.resolve(process.env.JEST_PUPPETEER_CONFIG))

// we needed chrome args property from the jest-puppeteer.config.cjs file but we don't want
// jest-puppeteer to re-use this require from cache because at this point in time, we don't have the web socket written.
delete require.cache[path.resolve(process.env.JEST_PUPPETEER_CONFIG)]

module.exports = async jestConfig => {
  // eslint-disable-next-line no-console
  console.log('\n')

  const revision = getChromiumRevision()

  // set the version of Chromium to use based on Puppeteer
  await dockerSetChromiumConfig({
    revision,
    flags: chromiumFlags,
    downloadHost,
    useClosestUbuntuMirror
  })

  // launch Chromium in Docker ready for the first test suite
  const endpointPath = path.join(__dirname, 'wsEndpoint')
  const webSocketUri = await dockerRunChromium()
  fs.writeFileSync(endpointPath, webSocketUri)

  await setupPuppeteer(jestConfig)
}
