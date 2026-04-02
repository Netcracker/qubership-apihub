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
    it('should resolve effective apiKind from operation and channel x-api-kind', () => {
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
    let operationNoKindChannelNoKind: ApiOperation
    let operationNoKindChannelBWC: ApiOperation
    let operationNoKindChannelNoBWC: ApiOperation
    let operationBWCChannelNoKind: ApiOperation
    let operationNoBWCChannelNoKind: ApiOperation
    let operationBWCChannelBWC: ApiOperation
    let operationBWCChannelNoBWC: ApiOperation
    let operationNoBWCChannelBWC: ApiOperation
    let operationNoBWCChannelNoBWC: ApiOperation

    beforeAll(async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/api-kind/base')
      ;[
        operationNoKindChannelNoKind,
        operationNoKindChannelBWC,
        operationNoKindChannelNoBWC,
        operationBWCChannelNoKind,
        operationNoBWCChannelNoKind,
        operationBWCChannelBWC,
        operationBWCChannelNoBWC,
        operationNoBWCChannelBWC,
        operationNoBWCChannelNoBWC,
      ] = Array.from(result.operations.values())
    })

    it('operationNoKindChannelNoKind → BWC', () => {
      expect(operationNoKindChannelNoKind.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_BWC)
    })

    it('operationNoKindChannelBWC → BWC', () => {
      expect(operationNoKindChannelBWC.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_BWC)
    })

    it('operationNoKindChannelNoBWC → NoBWC', () => {
      expect(operationNoKindChannelNoBWC.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_NO_BWC)
    })

    it('operationBWCChannelNoKind → BWC', () => {
      expect(operationBWCChannelNoKind.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_BWC)
    })

    it('operationNoBWCChannelNoKind → NoBWC', () => {
      expect(operationNoBWCChannelNoKind.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_NO_BWC)
    })

    it('operationBWCChannelBWC → BWC', () => {
      expect(operationBWCChannelBWC.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_BWC)
    })

    it('operationBWCChannelNoBWC → BWC', () => {
      expect(operationBWCChannelNoBWC.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_BWC)
    })

    it('operationNoBWCChannelBWC → NoBWC', () => {
      expect(operationNoBWCChannelBWC.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_NO_BWC)
    })

    it('operationNoBWCChannelNoBWC → NoBWC', () => {
      expect(operationNoBWCChannelNoBWC.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_NO_BWC)
    })
  })

  it('should apply channel apiKind to all operations using that channel', async () => {
    const result = await buildPackageWithDefaultConfig('asyncapi/api-kind/share-channel-api-kind')
    const operations = Array.from(result.operations.values())

    expect(operations.every(operation => operation.apiKind === APIHUB_API_COMPATIBILITY_KIND_NO_BWC)).toBeTrue()
  })

  describe('Labels should not redefine AsyncAPI apiKind', () => {
    it('should not override default BWC apiKind with no-BWC label', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/api-kind/base', ['apihub/x-api-kind: no-BWC'])
      const operations = Array.from(result.operations.values())
      // First operation has no x-api-kind on operation or channel — should stay BWC despite label
      expect(operations[0].apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_BWC)
    })

    it('should not override channel NO_BWC apiKind with BWC label', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/api-kind/base', ['apihub/x-api-kind: BWC'])
      const operations = Array.from(result.operations.values())
      // Third operation uses channel-no-bwc — should stay NO_BWC despite BWC label
      expect(operations[2].apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_NO_BWC)
    })
  })
})
