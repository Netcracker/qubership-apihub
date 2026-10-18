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

const TESTS_FILTER = [
  '**/*.it-test.ts',
]

const HEADLESS_MODE = true
const DEVTOOLS = false
/*
  In order to record video ffmpeg must be installed in container/on host.
  It is really slow but puppeteer has not provided API to customize format, quality and performance yet
*/
const TEST_TIMEOUT = 300_000

const SCREEN_WIDTH = 1800
const SCREEN_HEIGHT = 1000
const LEFT_PANEL_SPLITTER_WIDTH = 210
const RIGHT_PANEL_SPLITTER_WIDTH = 400
const PREVIEW_WIDTH = SCREEN_WIDTH - (LEFT_PANEL_SPLITTER_WIDTH + RIGHT_PANEL_SPLITTER_WIDTH)  /* 1190 */
const PREVIEW_HEIGHT = SCREEN_HEIGHT - 40 /* 940, given paddings are 20 */
const LEFT_PANEL_SPLITTER_POSITION = LEFT_PANEL_SPLITTER_WIDTH
const RIGHT_PANEL_SPLITTER_POSITION = LEFT_PANEL_SPLITTER_POSITION + PREVIEW_WIDTH /* 1400 */

module.exports = {
  TESTS_FILTER,
  HEADLESS_MODE,
  DEVTOOLS,
  TEST_TIMEOUT,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  PREVIEW_WIDTH,
  PREVIEW_HEIGHT,
  LEFT_PANEL_SPLITTER_POSITION,
  RIGHT_PANEL_SPLITTER_POSITION,
}
