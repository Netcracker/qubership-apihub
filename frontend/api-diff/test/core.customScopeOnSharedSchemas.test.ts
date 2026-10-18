import { apiDiff, breaking, DiffAction, ReclassificationRule, risky } from '../src'
import type { Diff, DiffType, CustomScopeElementProvider } from '../src'

import singleMethodResponseBefore from './helper/resources/shared-schema-routes/single-method-response/before.json'
import singleMethodResponseAfter from './helper/resources/shared-schema-routes/single-method-response/after.json'

import singleMethodRequestResponseBefore
  from './helper/resources/shared-schema-routes/single-method-request-response/before.json'
import singleMethodRequestResponseAfter
  from './helper/resources/shared-schema-routes/single-method-request-response/after.json'

import multipleMethodsResponseBefore
  from './helper/resources/shared-schema-routes/multiple-methods-response/before.json'
import multipleMethodsResponseAfter
  from './helper/resources/shared-schema-routes/multiple-methods-response/after.json'

import multipleMethodsResponseRefBefore
  from './helper/resources/shared-schema-routes/multiple-methods-response-ref/before.json'
import multipleMethodsResponseRefAfter
  from './helper/resources/shared-schema-routes/multiple-methods-response-ref/after.json'

import multipleMethodsRequestResponseRefBefore
  from './helper/resources/shared-schema-routes/multiple-methods-request-response-ref/before.json'
import multipleMethodsRequestResponseRefAfter
  from './helper/resources/shared-schema-routes/multiple-methods-request-response-ref/after.json'

import { diffsMatcher } from './helper/matchers'
import type { RecursiveMatcher } from './helper/matchers'

type PATH_ENTRY = [string, string, string]

const GET_PATH1: PATH_ENTRY = ['paths', '/path1', 'get']
const POST_PATH1: PATH_ENTRY = ['paths', '/path1', 'post']

// The policy this suite compares under: some routes are marked, and a marked route softens a breaking
// change to risky. Nothing of it is known to the library
const SEASONING = 'seasoning'
const SEASONED = 'seasoned'

const downgradeSeasoned: ReclassificationRule = ({ type, customScope }) => (
  type === breaking && customScope?.[SEASONING] === SEASONED ? risky : undefined
)

function seasonedAtPaths(markedOperations: PATH_ENTRY[]): CustomScopeElementProvider['valueAt'] {
  return ({ path }) => {
    if (path.length !== 3) {
      return undefined
    }
    return markedOperations.some(operation =>
      operation.every((segment, index) => path[index] === segment),
    ) ? SEASONED : undefined
  }
}

const RESPONSE_SCHEMA_TYPE = ['responses', '200', 'content', 'application/json', 'schema', 'type']

/** One expected difference. `declaredAt` pins which operation it was reached through, where that matters. */
function replacedIn(scope: string, type: DiffType, declaredAt?: PATH_ENTRY): RecursiveMatcher<Diff> {
  const paths = declaredAt ? [[...declaredAt, ...RESPONSE_SCHEMA_TYPE]] : undefined
  return expect.objectContaining({
    action: DiffAction.replace,
    scope: scope,
    type: type,
    ...paths ? { beforeDeclarationPaths: paths, afterDeclarationPaths: paths } : {},
  })
}

/**
 * A difference on a schema two routes share. Both instances point at the same declaration paths, so the
 * custom scope each route was reached under is the only thing that tells them apart: pass the value the
 * route carried, or `undefined` for a route that carried none.
 * Written by hand rather than with `expect.objectContaining`, which requires the key to be present and so
 * cannot express the absence an unmarked route produces. Absence is asserted as absence, not as a lookup
 * that reads `undefined`, so a comparison that stamped an empty record on every difference would fail here.
 */
function replacedUnder(scope: string, type: DiffType, seasoning: string | undefined): RecursiveMatcher<Diff> {
  return {
    $$typeof: Symbol.for('jest.asymmetricMatcher'),
    asymmetricMatch: (diff: Diff) =>
      diff.action === DiffAction.replace &&
      diff.scope === scope &&
      diff.type === type &&
      (seasoning === undefined
        ? !('customScope' in diff)
        : diff.customScope?.[SEASONING] === seasoning),
    toString: () => `replacedUnder(${scope}, ${type}, ${seasoning ?? 'no scope'})`,
    // `diffsMatcher` prints its members through this hook and falls back to `JSON.stringify`, which drops
    // a symbol and two functions and would report every row of the table as `{}`
    toAsymmetricMatcher: () => `replacedUnder(${scope}, ${type}, ${seasoning ?? 'no scope'})`,
  } as unknown as RecursiveMatcher<Diff>
}

function diffsOf(before: unknown, after: unknown, marked: PATH_ENTRY[]): Diff[] {
  const { diffs } = apiDiff(before, after, {
    customScopeElementProviders: [{ name: SEASONING, valueAt: seasonedAtPaths(marked) }],
    reclassificationRules: [downgradeSeasoned],
  })
  return diffs
}

/**
 * Custom scope splitting on documents that share a schema between operations, which is what the mechanism
 * exists for. Both the scope element and the verdict drawn from it are a caller policy, played here by an
 * invented one: the library carries the value and never reads it.
 * Every case is the same comparison under a different set of marked routes, so the table is the spec: what
 * the mark is on, and which differences come out of it.
 */
describe('routes that disagree about a scope element', () => {
  it.each<{ desc: string, before: unknown, after: unknown, marked: PATH_ENTRY[], expected: RecursiveMatcher<Diff>[] }>([
    // A schema written out per operation: marking one route softens only its own difference
    {
      desc: 'softens the marked method and leaves the other breaking',
      before: multipleMethodsResponseBefore, after: multipleMethodsResponseAfter,
      marked: [GET_PATH1],
      expected: [
        replacedIn('response', risky, GET_PATH1),
        replacedIn('response', breaking, POST_PATH1),
      ],
    },
    {
      desc: 'softens both methods when both are marked',
      before: multipleMethodsResponseBefore, after: multipleMethodsResponseAfter,
      marked: [GET_PATH1, POST_PATH1],
      expected: [
        replacedIn('response', risky, GET_PATH1),
        replacedIn('response', risky, POST_PATH1),
      ],
    },
    // One schema behind a $ref: the routes split it, and the walk of the declaration site adds its own
    {
      desc: 'splits a shared response schema, and the declaration site keeps the rules verdict',
      before: multipleMethodsResponseRefBefore, after: multipleMethodsResponseRefAfter,
      marked: [GET_PATH1],
      expected: [
        replacedUnder('response', risky, SEASONED),
        replacedUnder('response', breaking, undefined),
        replacedUnder('components', breaking, undefined),
      ],
    },
    {
      desc: 'keeps one shared response instance when both routes agree',
      before: multipleMethodsResponseRefBefore, after: multipleMethodsResponseRefAfter,
      marked: [GET_PATH1, POST_PATH1],
      expected: [
        replacedUnder('response', risky, SEASONED),
        replacedUnder('components', breaking, undefined),
      ],
    },
    // The same $ref reached from request and response alike, so each scope splits on its own
    {
      desc: 'splits request and response separately when one route is marked',
      before: multipleMethodsRequestResponseRefBefore, after: multipleMethodsRequestResponseRefAfter,
      marked: [GET_PATH1],
      expected: [
        replacedUnder('request', risky, SEASONED),
        replacedUnder('request', breaking, undefined),
        replacedUnder('response', risky, SEASONED),
        replacedUnder('response', breaking, undefined),
        replacedUnder('components', breaking, undefined),
      ],
    },
    {
      desc: 'keeps one instance per scope when both routes agree',
      before: multipleMethodsRequestResponseRefBefore, after: multipleMethodsRequestResponseRefAfter,
      marked: [GET_PATH1, POST_PATH1],
      expected: [
        replacedUnder('request', risky, SEASONED),
        replacedUnder('response', risky, SEASONED),
        replacedUnder('components', breaking, undefined),
      ],
    },
  ])('$desc', ({ before, after, marked, expected }) => {
    expect(diffsOf(before, after, marked)).toEqual(diffsMatcher(expected))
  })
})

/**
 * Nothing disagrees here — every route carries the same value — so these pin the other half: a rule reads
 * the scope element and softens what it finds, on a document where no splitting can be involved.
 */
describe('a scope element every route agrees about', () => {
  it.each<{ desc: string, before: unknown, after: unknown, expected: RecursiveMatcher<Diff>[] }>([
    {
      desc: 'softens a response change',
      before: singleMethodResponseBefore, after: singleMethodResponseAfter,
      expected: [replacedIn('response', risky)],
    },
    {
      desc: 'softens a request and a response change alike',
      before: singleMethodRequestResponseBefore, after: singleMethodRequestResponseAfter,
      expected: [replacedIn('response', risky), replacedIn('request', risky)],
    },
  ])('$desc', ({ before, after, expected }) => {
    const { diffs } = apiDiff(before, after, {
      customScopeElementProviders: [{ name: SEASONING, valueAt: () => SEASONED }],
      reclassificationRules: [downgradeSeasoned],
    })
    expect(diffs).toEqual(diffsMatcher(expected))
  })
})
