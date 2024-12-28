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
import { TEST_TIMEOUT } from '../.config/it/constants.cjs'

jest.setTimeout(TEST_TIMEOUT)
jest.retryTimes(1, { logErrorsBeforeRetry: true })

const toMatchImageSnapshot = configureToMatchImageSnapshot({
  customDiffConfig: {
    threshold: 0.1, /* Noisy edges and shadows. 0.1 is default, change it if it is not enough  */
    diffColorAlt: [0, 0, 255],
    alpha: 0.3,
  },
  failureThreshold: 20, //not stable shadows
  customSnapshotIdentifier: ({ defaultIdentifier }) => defaultIdentifier,
  onlyDiff: false,
  storeReceivedOnFailure: true,
})

expect.extend({ toMatchImageSnapshot })
