import {
  annotation,
  breaking,
  deprecated,
  DiffAction,
  nonBreaking,
  risky,
  unclassified,
} from '@netcracker/qubership-apihub-api-diff'
import type { Diff, DiffType } from '@netcracker/qubership-apihub-api-diff'
import type { ApihubApiCompatibilityKind } from '../src'
import {
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  APIHUB_API_COMPATIBILITY_KIND_EXPERIMENTAL,
  APIHUB_API_COMPATIBILITY_KIND_NO_BWC,
} from '../src'
import { apiKindReclassificationRule, CUSTOM_SCOPE_ELEMENT_API_KIND } from '../src/components/compare/custom-scope'

/**
 * The rules reached directly, without publishing anything. The changelog suites exercise them end to end,
 * which proves they are wired in but not what they answer: dropping the `type === breaking` guard from the
 * api kind rule leaves every one of those suites green. These pin the answer itself.
 */

/** A removal, since that is the shape both rules are asked about most, under the given api kind. */
function removalUnder(type: DiffType, apiKind?: ApihubApiCompatibilityKind): Diff {
  return {
    action: DiffAction.remove,
    type,
    scope: 'request',
    beforeDeclarationPaths: [['paths', '/thing', 'get']],
    beforeValue: { deprecated: true },
    ...apiKind === undefined ? {} : { customScope: { [CUSTOM_SCOPE_ELEMENT_API_KIND]: apiKind } },
  }
}

const EVERY_DIFF_TYPE: DiffType[] = [breaking, nonBreaking, risky, annotation, deprecated, unclassified]

/** Every api kind a route can be reached under, `undefined` for a route carrying no mark at all. */
const EVERY_API_KIND: (ApihubApiCompatibilityKind | undefined)[] = [
  undefined,
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  APIHUB_API_COMPATIBILITY_KIND_NO_BWC,
  APIHUB_API_COMPATIBILITY_KIND_EXPERIMENTAL,
]

describe('apiKindReclassificationRule', () => {
  // The api kinds a no-BWC-like mark can take, and the ones that must leave the verdict alone
  it.each<[ApihubApiCompatibilityKind, DiffType | undefined]>([
    [APIHUB_API_COMPATIBILITY_KIND_NO_BWC, risky],
    [APIHUB_API_COMPATIBILITY_KIND_EXPERIMENTAL, risky],
    [APIHUB_API_COMPATIBILITY_KIND_BWC, undefined],
  ])('should answer %s with %s', (apiKind, expected) => {
    expect(apiKindReclassificationRule(removalUnder(breaking, apiKind))).toBe(expected)
  })

  it('should decline a difference reached under no api kind at all', () => {
    // What every route of a comparison that declares no provider carries, and what an unmarked route
    // carries once one is declared: the field is absent, not empty
    expect(apiKindReclassificationRule(removalUnder(breaking))).toBeUndefined()
  })

  it('should decline a value no api kind of ours spells', () => {
    // Cast on purpose: the point is a value outside the type, which is what a stale or hand-edited
    // custom scope would carry, and the rule has to answer it rather than treat it as no-BWC-like
    const outsideTheType = 'no-bwc-ish' as ApihubApiCompatibilityKind

    expect(apiKindReclassificationRule(removalUnder(breaking, outsideTheType))).toBeUndefined()
  })

  // The guard the end-to-end suites cannot see: dropping it leaves all of them green, because no fixture
  // reaches this rule with a difference the specification rules already called anything but breaking
  it.each(EVERY_DIFF_TYPE.filter(type => type !== breaking))(
    'should leave a %s difference alone even under a no-BWC mark',
    (type) => {
      expect(apiKindReclassificationRule(removalUnder(type, APIHUB_API_COMPATIBILITY_KIND_NO_BWC))).toBeUndefined()
    },
  )

  it('should answer only risky or nothing, whatever the difference and the mark', () => {
    const answers = EVERY_DIFF_TYPE.flatMap(type =>
      EVERY_API_KIND.map(apiKind => apiKindReclassificationRule(removalUnder(type, apiKind))))

    // The whole APIHUB policy in one line: a marked operation makes a breaking change risky and nothing
    // else. A rule that could return `nonBreaking` or `breaking` would change what the order of the
    // pipeline means, which no fixture can currently observe
    expect(new Set(answers)).toEqual(new Set([risky, undefined]))
  })

  it('should answer from the api kind of the difference it is given', () => {
    const marked = removalUnder(breaking, APIHUB_API_COMPATIBILITY_KIND_NO_BWC)
    const unmarked = removalUnder(breaking)

    // Two instances of one shared removal, told apart only by the scope each route was reached under
    expect(apiKindReclassificationRule(marked)).toBe(risky)
    expect(apiKindReclassificationRule(unmarked)).toBeUndefined()
  })
})
