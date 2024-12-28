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

const { TEST_TIMEOUT, HEADLESS_MODE, DEVTOOLS, SCREEN_WIDTH, SCREEN_HEIGHT } = require('./constants.cjs')

module.exports = {
    headless: HEADLESS_MODE,
    // slowMo: 500,
    devtools: DEVTOOLS,
    args: [
        `--window-size=${SCREEN_WIDTH},${SCREEN_HEIGHT}`,
        '--max-active-webgl-contexts=100',
    ],
    protocolTimeout: Math.round(1.1 * TEST_TIMEOUT), /* connection is longer than test timeout */
}
