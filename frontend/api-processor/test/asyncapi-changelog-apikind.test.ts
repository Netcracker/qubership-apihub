import {
  buildChangelogFromContent,
  changesSummaryMatcher,
  generateAsyncApiSpec,
  generateAsyncApiTwoChannelsSpec,
  generateAsyncApiTwoMessagesSpec,
  generateAsyncApiTwoOperationsSpec,
} from './helpers'
import {
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  APIHUB_API_COMPATIBILITY_KIND_NO_BWC,
  ApihubApiCompatibilityKind,
  ASYNCAPI_API_TYPE,
  BREAKING_CHANGE_TYPE,
  RISKY_CHANGE_TYPE,
  UNCLASSIFIED_CHANGE_TYPE,
} from '../src'
import { createAsyncApiCompatibilityScopeFunction } from '../src/components/compare/async.bwc.validation'
import {
  API_COMPATIBILITY_KIND_BACKWARD_COMPATIBLE,
  API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE,
} from '@netcracker/qubership-apihub-api-diff'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'
import { API_KIND_SPECIFICATION_EXTENSION } from '../src'

const BWC = APIHUB_API_COMPATIBILITY_KIND_BWC
const NO_BWC = APIHUB_API_COMPATIBILITY_KIND_NO_BWC

const BREAKING = BREAKING_CHANGE_TYPE
const RISKY = RISKY_CHANGE_TYPE

type ChangeType = typeof BREAKING | typeof RISKY
type ApiKindValue = ApihubApiCompatibilityKind | undefined

const isNoBwc = (value: ApiKindValue | null): value is typeof NO_BWC => value === NO_BWC

// Effective api-kind resolution: operation overrides channel, channel overrides default (BWC)
function effectiveApiKind(channel: ApiKindValue, operation: ApiKindValue): typeof BWC | typeof NO_BWC {
  if (operation) {
    return isNoBwc(operation) ? NO_BWC : BWC
  }
  if (channel) {
    return isNoBwc(channel) ? NO_BWC : BWC
  }
  return BWC
}

// Modify: if at least one effective api kind is no-BWC → risky, otherwise breaking
function expectedModifyType(
  beforeCh: ApiKindValue, beforeOp: ApiKindValue,
  afterCh: ApiKindValue, afterOp: ApiKindValue,
): ChangeType {
  const beforeKind = effectiveApiKind(beforeCh, beforeOp)
  const afterKind = effectiveApiKind(afterCh, afterOp)
  return (beforeKind === NO_BWC || afterKind === NO_BWC) ? RISKY : BREAKING
}

// Remove: effective api kind of the before operation, if no-BWC → risky, otherwise breaking
function expectedRemoveType(beforeCh: ApiKindValue, beforeOp: ApiKindValue): ChangeType {
  return effectiveApiKind(beforeCh, beforeOp) === NO_BWC ? RISKY : BREAKING
}

function buildExpected(changeType: typeof BREAKING | typeof RISKY, unclassified: number): Record<string, number> {
  return {
    [changeType]: 1,
    ...(unclassified > 0 && { [UNCLASSIFIED_CHANGE_TYPE]: unclassified }),
  }
}

describe('Changelog backward compatibility scope function', () => {
  const BWC = APIHUB_API_COMPATIBILITY_KIND_BWC
  const NO_BWC = APIHUB_API_COMPATIBILITY_KIND_NO_BWC

  const BACKWARD_COMPATIBLE = API_COMPATIBILITY_KIND_BACKWARD_COMPATIBLE
  const NOT_BACKWARD_COMPATIBLE = API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE

  // null = object absent (added/removed), undefined = object exists without x-api-kind
  type ApiKindInput = ApihubApiCompatibilityKind | undefined | null

  const buildChannel = (kind: ApiKindInput): AsyncAPIV3.ChannelObject | undefined => {
    if (kind === null) { return undefined }
    const channel: AsyncAPIV3.ChannelObject = { address: 'channel1' }
    if (kind !== undefined) { channel[API_KIND_SPECIFICATION_EXTENSION] = kind }
    return channel
  }

  const buildOperation = (kind: ApiKindInput): AsyncAPIV3.OperationObject | undefined => {
    if (kind === null) { return undefined }
    const operation: AsyncAPIV3.OperationObject = { action: 'send', channel: {} }
    if (kind !== undefined) { operation[API_KIND_SPECIFICATION_EXTENSION] = kind }
    return operation
  }

  describe('Root level', () => {
    it.each([
      // prev    | curr    | expected
      [BWC, BWC, BACKWARD_COMPATIBLE],
      [BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
    ] as const)('should classify root scope prev(%s) curr(%s) as %s', (prev, curr, expected) => {
      const scopeFunction = createAsyncApiCompatibilityScopeFunction(prev, curr)
      expect(scopeFunction([], {}, {})).toBe(expected)
    })
  })

  describe('Channels scope', () => {
    it.each([
      // document | before    | after     | expected
      // null = channel added/removed
      [BWC, undefined, undefined, BACKWARD_COMPATIBLE],
      [BWC, undefined, BWC, BACKWARD_COMPATIBLE],
      [BWC, undefined, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [BWC, BWC, undefined, BACKWARD_COMPATIBLE],
      [BWC, BWC, BWC, BACKWARD_COMPATIBLE],
      [BWC, BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [BWC, NO_BWC, undefined, NOT_BACKWARD_COMPATIBLE],
      [BWC, NO_BWC, BWC, NOT_BACKWARD_COMPATIBLE],
      [BWC, NO_BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [BWC, null, undefined, BACKWARD_COMPATIBLE],
      [BWC, null, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [BWC, undefined, null, BACKWARD_COMPATIBLE],
      [BWC, NO_BWC, null, NOT_BACKWARD_COMPATIBLE],
      // Unrealistic: diff engine never calls scope for a path absent in both versions. Defensive guard.
      [BWC, null, null, undefined],

      [NO_BWC, undefined, undefined, BACKWARD_COMPATIBLE],
      [NO_BWC, undefined, BWC, BACKWARD_COMPATIBLE],
      [NO_BWC, undefined, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, BWC, undefined, BACKWARD_COMPATIBLE],
      [NO_BWC, BWC, BWC, BACKWARD_COMPATIBLE],
      [NO_BWC, BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, NO_BWC, undefined, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, NO_BWC, BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, NO_BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, null, undefined, BACKWARD_COMPATIBLE],
      [NO_BWC, null, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, undefined, null, BACKWARD_COMPATIBLE],
      [NO_BWC, NO_BWC, null, NOT_BACKWARD_COMPATIBLE],
      // Unrealistic: diff engine never calls scope for a path absent in both versions. Defensive guard.
      [NO_BWC, null, null, undefined],
    ] as const)('should classify channel scope document(%s) before(%s) after(%s) as %s', (
      documentApiKind,
      beforeKind,
      afterKind,
      expected,
    ) => {
      const scopeFunction = createAsyncApiCompatibilityScopeFunction(documentApiKind, documentApiKind)
      expect(scopeFunction(['channels', 'ch1'], buildChannel(beforeKind), buildChannel(afterKind))).toBe(expected)
    })
  })

  describe('Operations scope', () => {
    it.each([
      // document | before    | after     | expected
      // null = operation added/removed
      [BWC, undefined, undefined, BACKWARD_COMPATIBLE],
      [BWC, undefined, BWC, BACKWARD_COMPATIBLE],
      [BWC, undefined, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [BWC, undefined, null, BACKWARD_COMPATIBLE],
      [BWC, BWC, undefined, BACKWARD_COMPATIBLE],
      [BWC, BWC, BWC, BACKWARD_COMPATIBLE],
      [BWC, BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [BWC, BWC, null, BACKWARD_COMPATIBLE],
      [BWC, NO_BWC, undefined, NOT_BACKWARD_COMPATIBLE],
      [BWC, NO_BWC, BWC, NOT_BACKWARD_COMPATIBLE],
      [BWC, NO_BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [BWC, NO_BWC, null, NOT_BACKWARD_COMPATIBLE],
      [BWC, null, undefined, BACKWARD_COMPATIBLE],
      [BWC, null, BWC, BACKWARD_COMPATIBLE],
      [BWC, null, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      // Unrealistic: diff engine never calls scope for a path absent in both versions. Defensive guard.
      [BWC, null, null, undefined],

      [NO_BWC, undefined, undefined, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, undefined, BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, undefined, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, undefined, null, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, BWC, undefined, NOT_BACKWARD_COMPATIBLE], //BACKWARD_COMPATIBLE
      [NO_BWC, BWC, BWC, BACKWARD_COMPATIBLE],
      [NO_BWC, BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, BWC, null, NOT_BACKWARD_COMPATIBLE],//BACKWARD_COMPATIBLE
      [NO_BWC, NO_BWC, undefined, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, NO_BWC, BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, NO_BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, NO_BWC, null, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, null, undefined, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, null, BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, null, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      // Unrealistic: diff engine never calls scope for a path absent in both versions. Defensive guard.
      [NO_BWC, null, null, undefined],
    ] as const)('should classify operation scope document(%s) before(%s) after(%s) as %s', (
      documentApiKind,
      beforeKind,
      afterKind,
      expected,
    ) => {
      const scopeFunction = createAsyncApiCompatibilityScopeFunction(documentApiKind, documentApiKind)
      expect(scopeFunction(['operations', 'op1'], buildOperation(beforeKind), buildOperation(afterKind))).toBe(expected)
    })

    it('should use channel x-api-kind as fallback when operation has no x-api-kind', () => {
      const scopeFunction = createAsyncApiCompatibilityScopeFunction()
      const before = {
        action: 'send' as const,
        channel: { [API_KIND_SPECIFICATION_EXTENSION]: NO_BWC },
      }
      const after = { action: 'send' as const, channel: {} }
      expect(scopeFunction(['operations', 'op1'], before, after)).toBe(NOT_BACKWARD_COMPATIBLE)
    })

    it('should let operation x-api-kind override channel x-api-kind', () => {
      const scopeFunction = createAsyncApiCompatibilityScopeFunction()
      const before = {
        action: 'send' as const,
        [API_KIND_SPECIFICATION_EXTENSION]: BWC,
        channel: { [API_KIND_SPECIFICATION_EXTENSION]: NO_BWC },
      }
      const after = {
        action: 'send' as const,
        [API_KIND_SPECIFICATION_EXTENSION]: BWC,
        channel: { [API_KIND_SPECIFICATION_EXTENSION]: NO_BWC },
      }
      expect(scopeFunction(['operations', 'op1'], before, after)).toBe(BACKWARD_COMPATIBLE)
    })
  })

  describe('Other paths', () => {
    const scopeFunction = createAsyncApiCompatibilityScopeFunction()

    it('should return undefined for non-operations/non-channels paths', () => {
      expect(scopeFunction(['components', 'messages'], {}, {})).toBeUndefined()
    })

    it('should return undefined for deeper operation paths', () => {
      expect(scopeFunction(['operations', 'op1', 'channel'], {}, {})).toBeUndefined()
    })

    it('should return undefined for deeper channel paths', () => {
      expect(scopeFunction(['channels', 'ch1', 'messages'], {}, {})).toBeUndefined()
    })
  })
})

describe('AsyncAPI changelog api-kind tests', () => {
  describe('Remove operation tests', () => {

    // [beforeCh, beforeOp, afterCh, expectedType, unclassified]
    // unclassified — number of UNCLASSIFIED changes caused by x-api-kind property itself being added/removed/changed
    type RemoveOperationCase = [ApiKindValue, ApiKindValue, ApiKindValue, ChangeType, number]

    const removeOperationCases: RemoveOperationCase[] = [
      // beforeCh=none
      [undefined,  undefined,  undefined,  BREAKING, 0],
      [undefined,  undefined,  BWC,        BREAKING, 1],
      [undefined,  undefined,  NO_BWC,     BREAKING, 1],
      [undefined,  BWC,        undefined,  BREAKING, 0],
      [undefined,  BWC,        BWC,        BREAKING, 1],
      [undefined,  BWC,        NO_BWC,     BREAKING, 1],
      [undefined,  NO_BWC,     undefined,  RISKY, 0],
      [undefined,  NO_BWC,     BWC,        RISKY, 1],
      [undefined,  NO_BWC,     NO_BWC,     RISKY, 1],
      // beforeCh=BWC
      [BWC,        undefined,  undefined,  BREAKING, 1],
      [BWC,        undefined,  BWC,        BREAKING, 0],
      [BWC,        undefined,  NO_BWC,     BREAKING, 1],
      [BWC,        BWC,        undefined,  BREAKING, 1],
      [BWC,        BWC,        BWC,        BREAKING, 0],
      [BWC,        BWC,        NO_BWC,     BREAKING, 1],
      [BWC,        NO_BWC,     undefined,  RISKY, 1],
      [BWC,        NO_BWC,     BWC,        RISKY, 0],
      [BWC,        NO_BWC,     NO_BWC,     RISKY, 1],
      // beforeCh=no-BWC
      [NO_BWC,     undefined,  undefined,  RISKY, 1],
      [NO_BWC,     undefined,  BWC,        RISKY, 1],
      [NO_BWC,     undefined,  NO_BWC,     RISKY, 0],
      [NO_BWC,     BWC,        undefined,  BREAKING, 1],
      [NO_BWC,     BWC,        BWC,        BREAKING, 1],
      [NO_BWC,     BWC,        NO_BWC,     BREAKING, 0],
      [NO_BWC,     NO_BWC,     undefined,  RISKY, 1],
      [NO_BWC,     NO_BWC,     BWC,        RISKY, 1],
      [NO_BWC,     NO_BWC,     NO_BWC,     RISKY, 0],
    ]

    test.concurrent.each(removeOperationCases)(
      'should classify removed operation before(channel:%s, operation:%s) after(channel:%s) as %s',
      async (beforeCh, beforeOp, afterCh, expectedType, unclassified) => {
        // Guard: verify that the hardcoded ER in the table matches the computed value
        expect(expectedType).toBe(expectedRemoveType(beforeCh, beforeOp))
        const beforeYaml = generateAsyncApiTwoOperationsSpec(beforeCh, beforeOp)
        const afterYaml = generateAsyncApiSpec('number', afterCh)
        const packageId = `asyncapi-apikind-remove-operation/channel-${beforeCh}-${afterCh}-operation-${beforeOp}`

        const result = await buildChangelogFromContent(packageId, beforeYaml, afterYaml)
        expect(result).toEqual(changesSummaryMatcher(buildExpected(expectedType, unclassified), ASYNCAPI_API_TYPE))
      },
    )
  })

  describe('Remove channel tests', () => {
    // [beforeCh, beforeOp, expectedType, unclassified]
    // unclassified — number of UNCLASSIFIED changes caused by x-api-kind property itself being added/removed/changed
    type RemoveChannelCase = [ApiKindValue, ApiKindValue, ChangeType, number]

    const removeChannelCases: RemoveChannelCase[] = [
      [undefined,  undefined,  BREAKING, 0],
      [undefined,  BWC,        BREAKING, 0],
      [undefined,  NO_BWC,     RISKY, 0],
      [BWC,        undefined,  BREAKING, 0],
      [BWC,        BWC,        BREAKING, 0],
      [BWC,        NO_BWC,     RISKY, 0],
      [NO_BWC,     undefined,  RISKY, 0],
      [NO_BWC,     BWC,        BREAKING, 0],
      [NO_BWC,     NO_BWC,     RISKY, 0],
    ]

    test.concurrent.each(removeChannelCases)(
      'should classify removed channel before(channel:%s, operation:%s) as %s',
      async (beforeChannel, beforeOperation, expectedType, unclassified) => {
        // Guard: verify that the hardcoded ER in the table matches the computed value
        expect(expectedType).toBe(expectedRemoveType(beforeChannel, beforeOperation))

        const beforeYaml = generateAsyncApiTwoChannelsSpec(beforeChannel, beforeOperation)
        const afterYaml = generateAsyncApiSpec()
        const packageId = `asyncapi-apikind-changelog-remove-channel/channel-${beforeChannel}-operation-${beforeOperation}`

        const result = await buildChangelogFromContent(packageId, beforeYaml, afterYaml)
        expect(result).toEqual(changesSummaryMatcher(buildExpected(expectedType, unclassified), ASYNCAPI_API_TYPE))
      },
    )
  })

  describe('Remove message tests', () => {
    // before: 1 operation with 2 messages, after: same operation with 1 message (message2 removed)
    // [beforeCh, beforeOp, afterCh, afterOp, expectedType, unclassified]
    // unclassified — number of UNCLASSIFIED changes caused by x-api-kind property itself being added/removed/changed
    type RemoveMessageCase = [ApiKindValue, ApiKindValue, ApiKindValue, ApiKindValue, ChangeType, number]

    const removeMessageCases: RemoveMessageCase[] = [
      // beforeCh=none, beforeOp=none
      [undefined,  undefined,  undefined,  undefined,  BREAKING, 0],
      [undefined,  undefined,  undefined,  BWC,        BREAKING, 1],
      //[undefined,  undefined,  undefined,  NO_BWC,     BREAKING, 1],  //TODO: should be fixed in api-diff
      [undefined,  undefined,  BWC,        undefined,  BREAKING, 1],
      [undefined,  undefined,  BWC,        BWC,        BREAKING, 2],
      //[undefined,  undefined,  BWC,        NO_BWC,     BREAKING, 2],  //TODO: should be fixed in api-diff
      //[undefined,  undefined,  NO_BWC,     undefined,  BREAKING, 1],  //TODO: should be fixed in api-diff
      [undefined,  undefined,  NO_BWC,     BWC,        BREAKING, 2],
      //[undefined,  undefined,  NO_BWC,     NO_BWC,     BREAKING, 2],  //TODO: should be fixed in api-diff
      // beforeCh=none, beforeOp=BWC
      [undefined,  BWC,        undefined,  undefined,  BREAKING, 1],
      [undefined,  BWC,        undefined,  BWC,        BREAKING, 0],
      //[undefined,  BWC,        undefined,  NO_BWC,     BREAKING, 1],  //TODO: should be fixed in api-diff
      [undefined,  BWC,        BWC,        undefined,  BREAKING, 2],
      [undefined,  BWC,        BWC,        BWC,        BREAKING, 1],
      //[undefined,  BWC,        BWC,        NO_BWC,     BREAKING, 2],  //TODO: should be fixed in api-diff
      //[undefined,  BWC,        NO_BWC,     undefined,  BREAKING, 2],  //TODO: should be fixed in api-diff
      [undefined,  BWC,        NO_BWC,     BWC,        BREAKING, 1],
      //[undefined,  BWC,        NO_BWC,     NO_BWC,     BREAKING, 2],  //TODO: should be fixed in api-diff
      // beforeCh=none, beforeOp=no-BWC
      [undefined,  NO_BWC,     undefined,  undefined,  RISKY, 1],
      [undefined,  NO_BWC,     undefined,  BWC,        RISKY, 1],
      [undefined,  NO_BWC,     undefined,  NO_BWC,     RISKY, 0],
      [undefined,  NO_BWC,     BWC,        undefined,  RISKY, 2],
      [undefined,  NO_BWC,     BWC,        BWC,        RISKY, 2],
      [undefined,  NO_BWC,     BWC,        NO_BWC,     RISKY, 1],
      [undefined,  NO_BWC,     NO_BWC,     undefined,  RISKY, 2],
      [undefined,  NO_BWC,     NO_BWC,     BWC,        RISKY, 2],
      [undefined,  NO_BWC,     NO_BWC,     NO_BWC,     RISKY, 1],

      // beforeCh=BWC, beforeOp=none
      [BWC,        undefined,  undefined,  undefined,  BREAKING, 1],
      [BWC,        undefined,  undefined,  BWC,        BREAKING, 2],
      //[BWC,        undefined,  undefined,  NO_BWC,     BREAKING, 2],  //TODO: should be fixed in api-diff
      [BWC,        undefined,  BWC,        undefined,  BREAKING, 0],
      [BWC,        undefined,  BWC,        BWC,        BREAKING, 1],
      //[BWC,        undefined,  BWC,        NO_BWC,     BREAKING, 1],  //TODO: should be fixed in api-diff
      //[BWC,        undefined,  NO_BWC,     undefined,  BREAKING, 1],  //TODO: should be fixed in api-diff
      [BWC,        undefined,  NO_BWC,     BWC,        BREAKING, 2],
      //[BWC,        undefined,  NO_BWC,     NO_BWC,     BREAKING, 2],  //TODO: should be fixed in api-diff
      // beforeCh=BWC, beforeOp=BWC
      [BWC,        BWC,        undefined,  undefined,  BREAKING, 2],
      [BWC,        BWC,        undefined,  BWC,        BREAKING, 1],
      //[BWC,        BWC,        undefined,  NO_BWC,     BREAKING, 2],  //TODO: should be fixed in api-diff
      [BWC,        BWC,        BWC,        undefined,  BREAKING, 1],
      [BWC,        BWC,        BWC,        BWC,        BREAKING, 0],
      //[BWC,        BWC,        BWC,        NO_BWC,     BREAKING, 1],  //TODO: should be fixed in api-diff
      //[BWC,        BWC,        NO_BWC,     undefined,  BREAKING, 2],  //TODO: should be fixed in api-diff
      [BWC,        BWC,        NO_BWC,     BWC,        BREAKING, 1],
      //[BWC,        BWC,        NO_BWC,     NO_BWC,     BREAKING, 2],  //TODO: should be fixed in api-diff
      // beforeCh=BWC, beforeOp=no-BWC
      [BWC,        NO_BWC,     undefined,  undefined,  RISKY, 2],
      [BWC,        NO_BWC,     undefined,  BWC,        RISKY, 2],
      [BWC,        NO_BWC,     undefined,  NO_BWC,     RISKY, 1],
      [BWC,        NO_BWC,     BWC,        undefined,  RISKY, 1],
      [BWC,        NO_BWC,     BWC,        BWC,        RISKY, 1],
      [BWC,        NO_BWC,     BWC,        NO_BWC,     RISKY, 0],
      [BWC,        NO_BWC,     NO_BWC,     undefined,  RISKY, 2],
      [BWC,        NO_BWC,     NO_BWC,     BWC,        RISKY, 2],
      [BWC,        NO_BWC,     NO_BWC,     NO_BWC,     RISKY, 1],

      // beforeCh=no-BWC, beforeOp=none
      [NO_BWC,     undefined,  undefined,  undefined,  RISKY, 1],
      [NO_BWC,     undefined,  undefined,  BWC,        RISKY, 2],
      [NO_BWC,     undefined,  undefined,  NO_BWC,     RISKY, 2],
      [NO_BWC,     undefined,  BWC,        undefined,  RISKY, 1],
      [NO_BWC,     undefined,  BWC,        BWC,        RISKY, 2],
      [NO_BWC,     undefined,  BWC,        NO_BWC,     RISKY, 2],
      [NO_BWC,     undefined,  NO_BWC,     undefined,  RISKY, 0],
      [NO_BWC,     undefined,  NO_BWC,     BWC,        RISKY, 1],
      [NO_BWC,     undefined,  NO_BWC,     NO_BWC,     RISKY, 1],
      // beforeCh=no-BWC, beforeOp=BWC
      [NO_BWC,     BWC,        undefined,  undefined,  BREAKING, 2],
      [NO_BWC,     BWC,        undefined,  BWC,        BREAKING, 1],
      //[NO_BWC,     BWC,        undefined,  NO_BWC,     BREAKING, 2],  //TODO: should be fixed in api-diff
      [NO_BWC,     BWC,        BWC,        undefined,  BREAKING, 2],
      [NO_BWC,     BWC,        BWC,        BWC,        BREAKING, 1],
      //[NO_BWC,     BWC,        BWC,        NO_BWC,     BREAKING, 2],  //TODO: should be fixed in api-diff
      //[NO_BWC,     BWC,        NO_BWC,     undefined,  BREAKING, 1],  //TODO: should be fixed in api-diff
      [NO_BWC,     BWC,        NO_BWC,     BWC,        BREAKING, 0],
      //[NO_BWC,     BWC,        NO_BWC,     NO_BWC,     BREAKING, 1],  //TODO: should be fixed in api-diff
      // beforeCh=no-BWC, beforeOp=no-BWC
      [NO_BWC,     NO_BWC,     undefined,  undefined,  RISKY, 2],
      [NO_BWC,     NO_BWC,     undefined,  BWC,        RISKY, 2],
      [NO_BWC,     NO_BWC,     undefined,  NO_BWC,     RISKY, 1],
      [NO_BWC,     NO_BWC,     BWC,        undefined,  RISKY, 2],
      [NO_BWC,     NO_BWC,     BWC,        BWC,        RISKY, 2],
      [NO_BWC,     NO_BWC,     BWC,        NO_BWC,     RISKY, 1],
      [NO_BWC,     NO_BWC,     NO_BWC,     undefined,  RISKY, 1],
      [NO_BWC,     NO_BWC,     NO_BWC,     BWC,        RISKY, 1],
      [NO_BWC,     NO_BWC,     NO_BWC,     NO_BWC,     RISKY, 0],
    ]

    test.concurrent.each(removeMessageCases)(
      'should classify removed message before(channel:%s, operation:%s) after(channel:%s, operation:%s) as %s',
      async (beforeCh, beforeOp, afterCh, afterOp, expectedType, unclassified) => {
        // Guard: verify that the hardcoded ER in the table matches the computed value
        expect(expectedType).toBe(expectedRemoveType(beforeCh, beforeOp))

        const beforeYaml = generateAsyncApiTwoMessagesSpec(beforeCh, beforeOp)
        const afterYaml = generateAsyncApiSpec('number', afterCh, afterOp)
        const packageId = `asyncapi-apikind-changelog-remove-message/channel-${beforeCh}-${afterCh}-operation-${beforeOp}-${afterOp}`

        const result = await buildChangelogFromContent(packageId, beforeYaml, afterYaml)
        expect(result).toEqual(changesSummaryMatcher(buildExpected(expectedType, unclassified), ASYNCAPI_API_TYPE))
      },
    )
  })

  describe('Modify message payload tests', () => {
    // [beforeCh, beforeOp, afterCh, afterOp, expectedType, unclassified]
    // unclassified — number of UNCLASSIFIED changes caused by x-api-kind property itself being added/removed/changed
    type ComboCase = [ApiKindValue, ApiKindValue, ApiKindValue, ApiKindValue, ChangeType, number]

    const allCombinations: ComboCase[] = [
      // beforeCh=none, beforeOp=none
      [undefined,  undefined,  undefined,  undefined,  BREAKING, 0],
      [undefined,  undefined,  undefined,  BWC,        BREAKING, 1],
      [undefined,  undefined,  undefined,  NO_BWC,     RISKY, 1],
      [undefined,  undefined,  BWC,        undefined,  BREAKING, 1],
      [undefined,  undefined,  BWC,        BWC,        BREAKING, 2],
      [undefined,  undefined,  BWC,        NO_BWC,     RISKY, 2],
      [undefined,  undefined,  NO_BWC,     undefined,  RISKY, 1],
      [undefined,  undefined,  NO_BWC,     BWC,        BREAKING, 2],
      [undefined,  undefined,  NO_BWC,     NO_BWC,     RISKY, 2],
      // beforeCh=none, beforeOp=BWC
      [undefined,  BWC,        undefined,  undefined,  BREAKING, 1],
      [undefined,  BWC,        undefined,  BWC,        BREAKING, 0],
      [undefined,  BWC,        undefined,  NO_BWC,     RISKY, 1],
      [undefined,  BWC,        BWC,        undefined,  BREAKING, 2],
      [undefined,  BWC,        BWC,        BWC,        BREAKING, 1],
      [undefined,  BWC,        BWC,        NO_BWC,     RISKY, 2],
      [undefined,  BWC,        NO_BWC,     undefined,  RISKY, 2],
      [undefined,  BWC,        NO_BWC,     BWC,        BREAKING, 1],
      [undefined,  BWC,        NO_BWC,     NO_BWC,     RISKY, 2],
      // beforeCh=none, beforeOp=no-BWC
      [undefined,  NO_BWC,     undefined,  undefined,  RISKY, 1],
      [undefined,  NO_BWC,     undefined,  BWC,        RISKY, 1],
      [undefined,  NO_BWC,     undefined,  NO_BWC,     RISKY, 0],
      [undefined,  NO_BWC,     BWC,        undefined,  RISKY, 2],
      [undefined,  NO_BWC,     BWC,        BWC,        RISKY, 2],
      [undefined,  NO_BWC,     BWC,        NO_BWC,     RISKY, 1],
      [undefined,  NO_BWC,     NO_BWC,     undefined,  RISKY, 2],
      [undefined,  NO_BWC,     NO_BWC,     BWC,        RISKY, 2],
      [undefined,  NO_BWC,     NO_BWC,     NO_BWC,     RISKY, 1],

      // beforeCh=BWC, beforeOp=none
      [BWC,        undefined,  undefined,  undefined,  BREAKING, 1],
      [BWC,        undefined,  undefined,  BWC,        BREAKING, 2],
      [BWC,        undefined,  undefined,  NO_BWC,     RISKY, 2],
      [BWC,        undefined,  BWC,        undefined,  BREAKING, 0],
      [BWC,        undefined,  BWC,        BWC,        BREAKING, 1],
      [BWC,        undefined,  BWC,        NO_BWC,     RISKY, 1],
      [BWC,        undefined,  NO_BWC,     undefined,  RISKY, 1],
      [BWC,        undefined,  NO_BWC,     BWC,        BREAKING, 2],
      [BWC,        undefined,  NO_BWC,     NO_BWC,     RISKY, 2],
      // beforeCh=BWC, beforeOp=BWC
      [BWC,        BWC,        undefined,  undefined,  BREAKING, 2],
      [BWC,        BWC,        undefined,  BWC,        BREAKING, 1],
      [BWC,        BWC,        undefined,  NO_BWC,     RISKY, 2],
      [BWC,        BWC,        BWC,        undefined,  BREAKING, 1],
      [BWC,        BWC,        BWC,        BWC,        BREAKING, 0],
      [BWC,        BWC,        BWC,        NO_BWC,     RISKY, 1],
      [BWC,        BWC,        NO_BWC,     undefined,  RISKY, 2],
      [BWC,        BWC,        NO_BWC,     BWC,        BREAKING, 1],
      [BWC,        BWC,        NO_BWC,     NO_BWC,     RISKY, 2],
      // beforeCh=BWC, beforeOp=no-BWC
      [BWC,        NO_BWC,     undefined,  undefined,  RISKY, 2],
      [BWC,        NO_BWC,     undefined,  BWC,        RISKY, 2],
      [BWC,        NO_BWC,     undefined,  NO_BWC,     RISKY, 1],
      [BWC,        NO_BWC,     BWC,        undefined,  RISKY, 1],
      [BWC,        NO_BWC,     BWC,        BWC,        RISKY, 1],
      [BWC,        NO_BWC,     BWC,        NO_BWC,     RISKY, 0],
      [BWC,        NO_BWC,     NO_BWC,     undefined,  RISKY, 2],
      [BWC,        NO_BWC,     NO_BWC,     BWC,        RISKY, 2],
      [BWC,        NO_BWC,     NO_BWC,     NO_BWC,     RISKY, 1],

      // beforeCh=no-BWC, beforeOp=none
      [NO_BWC,     undefined,  undefined,  undefined,  RISKY, 1],
      [NO_BWC,     undefined,  undefined,  BWC,        RISKY, 2],
      [NO_BWC,     undefined,  undefined,  NO_BWC,     RISKY, 2],
      [NO_BWC,     undefined,  BWC,        undefined,  RISKY, 1],
      [NO_BWC,     undefined,  BWC,        BWC,        RISKY, 2],
      [NO_BWC,     undefined,  BWC,        NO_BWC,     RISKY, 2],
      [NO_BWC,     undefined,  NO_BWC,     undefined,  RISKY, 0],
      [NO_BWC,     undefined,  NO_BWC,     BWC,        RISKY, 1],
      [NO_BWC,     undefined,  NO_BWC,     NO_BWC,     RISKY, 1],
      // beforeCh=no-BWC, beforeOp=BWC
      [NO_BWC,     BWC,        undefined,  undefined,  BREAKING, 2],
      [NO_BWC,     BWC,        undefined,  BWC,        BREAKING, 1],
      [NO_BWC,     BWC,        undefined,  NO_BWC,     RISKY, 2],
      [NO_BWC,     BWC,        BWC,        undefined,  BREAKING, 2],
      [NO_BWC,     BWC,        BWC,        BWC,        BREAKING, 1],
      [NO_BWC,     BWC,        BWC,        NO_BWC,     RISKY, 2],
      [NO_BWC,     BWC,        NO_BWC,     undefined,  RISKY, 1],
      [NO_BWC,     BWC,        NO_BWC,     BWC,        BREAKING, 0],
      [NO_BWC,     BWC,        NO_BWC,     NO_BWC,     RISKY, 1],
      // beforeCh=no-BWC, beforeOp=no-BWC
      [NO_BWC,     NO_BWC,     undefined,  undefined,  RISKY, 2],
      [NO_BWC,     NO_BWC,     undefined,  BWC,        RISKY, 2],
      [NO_BWC,     NO_BWC,     undefined,  NO_BWC,     RISKY, 1],
      [NO_BWC,     NO_BWC,     BWC,        undefined,  RISKY, 2],
      [NO_BWC,     NO_BWC,     BWC,        BWC,        RISKY, 2],
      [NO_BWC,     NO_BWC,     BWC,        NO_BWC,     RISKY, 1],
      [NO_BWC,     NO_BWC,     NO_BWC,     undefined,  RISKY, 1],
      [NO_BWC,     NO_BWC,     NO_BWC,     BWC,        RISKY, 1],
      [NO_BWC,     NO_BWC,     NO_BWC,     NO_BWC,     RISKY, 0],
    ]

    test.concurrent.each(allCombinations)(
      'should classify before(channel:%s, operation:%s) after(channel:%s, operation:%s) as %s',
      async (beforeChannel, beforeOperation, afterChannel, afterOperation, expectedType, unclassified) => {
        // Guard: verify that the hardcoded ER in the table matches the computed value
        expect(expectedType).toBe(expectedModifyType(beforeChannel, beforeOperation, afterChannel, afterOperation))

        const beforeYaml = generateAsyncApiSpec('number', beforeChannel, beforeOperation)
        const afterYaml = generateAsyncApiSpec('string', afterChannel, afterOperation)
        const packageId = `asyncapi-apikind-changelog/channel-${beforeChannel}-${afterChannel}-operation-${beforeOperation}-${afterOperation}`

        const result = await buildChangelogFromContent(packageId, beforeYaml, afterYaml)
        expect(result).toEqual(changesSummaryMatcher(buildExpected(expectedType, unclassified), ASYNCAPI_API_TYPE))
      },
    )
  })
})
