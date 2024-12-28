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

import { configureToMatchImageSnapshot } from 'jest-image-snapshot'

jest.setTimeout(300000)
jest.retryTimes(1)

const toMatchImageSnapshot = configureToMatchImageSnapshot({
  // comparisonMethod: "ssim",
  customDiffConfig: {
    threshold: 0.14, //not stable shadows and subpixels
    includeAA: false
  },
  failureThreshold: 5, //not stable shadows and subpixels
  customSnapshotIdentifier: ({ defaultIdentifier }) => {
    return defaultIdentifier
  }
})

expect.extend({ toMatchImageSnapshot })