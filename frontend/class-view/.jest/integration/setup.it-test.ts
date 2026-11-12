import { configureToMatchImageSnapshot } from 'jest-image-snapshot'

jest.setTimeout(300000)
jest.retryTimes(1)

const toMatchImageSnapshot = configureToMatchImageSnapshot({
  // comparisonMethod: "ssim",
  customDiffConfig: {
    threshold: 0.28, //not stable shadows and subpixels
    includeAA: false
  },
  failureThreshold: 20, //not stable shadows and subpixels
  customSnapshotIdentifier: ({ defaultIdentifier }) => {
    return defaultIdentifier
  }
})

expect.extend({ toMatchImageSnapshot })
