import { configureToMatchImageSnapshot } from 'jest-image-snapshot'
import { TEST_TIMEOUT } from '../.config/it/constants'

jest.setTimeout(TEST_TIMEOUT)
jest.retryTimes(1, { logErrorsBeforeRetry: true })

const toMatchImageSnapshot = configureToMatchImageSnapshot({
  customDiffConfig: {
    threshold: 0.1, /* Noisy edges and shadows. 0.1 is default, change it if it is not enough  */
    diffColorAlt: [0, 0, 255],
    alpha: 0.3,
  },
  failureThreshold: 20, //not stable shadows
  customSnapshotIdentifier: ({ defaultIdentifier }) => defaultIdentifier + '-snap',
  onlyDiff: false,
  storeReceivedOnFailure: true,
})

expect.extend({ toMatchImageSnapshot })
