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

import { beforeEach, expect, jest } from '@jest/globals'
import { configureToMatchImageSnapshot } from 'jest-image-snapshot'
import type { SnapshotState } from 'jest-snapshot'
import { TEST_TIMEOUT } from '../.config/it/constants.cjs'

/**
 * Jest (jest-circus) clears `snapshotState` on retries (event `test_retry`), which resets
 * the aggregated snapshot counters for the whole test file. For `jest-image-snapshot` this
 * causes "Tests != Snapshots" in the final summary when retries happen.
 *
 * Keep the counter reset behaviour (needed for stable snapshot identifiers), but preserve
 * the aggregated counters so the final "Snapshots:" summary stays correct.
 */
type ExpectStateWithSnapshot = ReturnType<typeof expect.getState> & {
  snapshotState?: SnapshotState
}

const patchedSnapshotStates = new WeakSet<SnapshotState>()

const patchSnapshotStateClear = () => {
  const state = expect.getState() as unknown as ExpectStateWithSnapshot
  const snapshotState = state.snapshotState
  if (!snapshotState || patchedSnapshotStates.has(snapshotState)) return

  patchedSnapshotStates.add(snapshotState)

  const originalClear = snapshotState.clear.bind(snapshotState)
  snapshotState.clear = () => {
    const before = {
      added: snapshotState.added,
      matched: snapshotState.matched,
      unmatched: snapshotState.unmatched,
      updated: snapshotState.updated,
    }

    originalClear()

    snapshotState.added = before.added
    snapshotState.matched = before.matched
    snapshotState.unmatched = before.unmatched
    snapshotState.updated = before.updated
  }
}

patchSnapshotStateClear()
beforeEach(patchSnapshotStateClear)

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
