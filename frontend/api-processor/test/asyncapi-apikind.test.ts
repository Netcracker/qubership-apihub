import {
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  APIHUB_API_COMPATIBILITY_KIND_NO_BWC,
  ApihubApiCompatibilityKind,
  ApiOperation,
} from '../src'
import { calculateAsyncApiKind } from '../src/apitypes/async/async.utils'
import { buildPackageWithDefaultConfig } from './helpers'

describe('AsyncAPI apiKind calculation', () => {
  describe('Unit tests', () => {
    it('should calculate apiKind from operation and channel values', () => {
      const data = [
        // Operation ApiKind, Channel ApiKnd, Result
        [undefined, undefined, APIHUB_API_COMPATIBILITY_KIND_BWC],
        [APIHUB_API_COMPATIBILITY_KIND_BWC, undefined, APIHUB_API_COMPATIBILITY_KIND_BWC],
        [undefined, APIHUB_API_COMPATIBILITY_KIND_BWC, APIHUB_API_COMPATIBILITY_KIND_BWC],
        [APIHUB_API_COMPATIBILITY_KIND_NO_BWC, undefined, APIHUB_API_COMPATIBILITY_KIND_NO_BWC],
        [undefined, APIHUB_API_COMPATIBILITY_KIND_NO_BWC, APIHUB_API_COMPATIBILITY_KIND_NO_BWC],
        [APIHUB_API_COMPATIBILITY_KIND_BWC, APIHUB_API_COMPATIBILITY_KIND_NO_BWC, APIHUB_API_COMPATIBILITY_KIND_BWC],
        [APIHUB_API_COMPATIBILITY_KIND_NO_BWC, APIHUB_API_COMPATIBILITY_KIND_BWC, APIHUB_API_COMPATIBILITY_KIND_NO_BWC],
      ]
      data.forEach(([operationApiKind, channelApiKind, expected]) => {
        const result = calculateAsyncApiKind(operationApiKind as ApihubApiCompatibilityKind, channelApiKind as ApihubApiCompatibilityKind)
        expect(result).toBe(expected)
      })
    })
  })

  describe('AsyncAPI operation/channel compatibility apiKind application', () => {
    let operation: ApiOperation
    let operationWithChannelBwc: ApiOperation
    let operationWithChannelNoBwc: ApiOperation
    let operationBwc: ApiOperation
    let operationNoBwc: ApiOperation
    let operationBwcWithChannelBwc: ApiOperation
    let operationBwcWithChannelNoBwc: ApiOperation
    let operationNoBwcWithChannelBwc: ApiOperation
    let operationNoBwcWithChannelNoBwc: ApiOperation

    beforeAll(async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/api-kind/base')
      ;[
        operation,
        operationWithChannelBwc,
        operationWithChannelNoBwc,
        operationBwc,
        operationNoBwc,
        operationBwcWithChannelBwc,
        operationBwcWithChannelNoBwc,
        operationNoBwcWithChannelBwc,
        operationNoBwcWithChannelNoBwc,
      ] = Array.from(result.operations.values())
    })

    it('should apply BWC apiKind when both operation and channel have no apiKind', () => {
      expect(operation.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_BWC)
    })

    it('should apply BWC apiKind when channel apiKind is BWC and operation has no apiKind', () => {
      expect(operationWithChannelBwc.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_BWC)
    })

    it('should apply NO_BWC apiKind when channel apiKind is NO_BWC and operation has no apiKind', () => {
      expect(operationWithChannelNoBwc.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_NO_BWC)
    })

    it('should apply BWC apiKind when operation apiKind is BWC and channel has no apiKind', () => {
      expect(operationBwc.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_BWC)
    })

    it('should apply NO_BWC apiKind when operation apiKind is NO_BWC and channel has no apiKind', () => {
      expect(operationNoBwc.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_NO_BWC)
    })

    it('should apply BWC apiKind when both operation and channel apiKind are BWC', () => {
      expect(operationBwcWithChannelBwc.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_BWC)
    })

    it('should apply BWC apiKind when operation apiKind is BWC and channel apiKind is NO_BWC', () => {
      expect(operationBwcWithChannelNoBwc.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_BWC)
    })

    it('should apply NO_BWC apiKind when operation apiKind is NO_BWC and channel apiKind is BWC', () => {
      expect(operationNoBwcWithChannelBwc.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_NO_BWC)
    })

    it('should apply NO_BWC apiKind when both operation and channel apiKind are NO_BWC', () => {
      expect(operationNoBwcWithChannelNoBwc.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_NO_BWC)
    })
  })

  it('should apply channel apiKind to all operations using that channel', async () => {
    const result = await buildPackageWithDefaultConfig('asyncapi/api-kind/share-channel-api-kind')
    const operations = Array.from(result.operations.values())

    expect(operations.every(operation => operation.apiKind === APIHUB_API_COMPATIBILITY_KIND_NO_BWC)).toBeTrue()
  })

  describe('Labels should not redefine AsyncAPI apiKind', () => {
    it('should not override default apiKind by Label', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/api-kind/base', ['apihub/x-api-kind: no-BWC'])
      const [operation] = Array.from(result.operations.values())
      expect(operation.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_BWC)
    })

    it('should not override operation/channel apiKind by Label', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/api-kind/base', ['apihub/x-api-kind: no-BWC'])
      const [operationWithCannelBwc] = Array.from(result.operations.values())
      expect(operationWithCannelBwc.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_BWC)
    })
  })
})
