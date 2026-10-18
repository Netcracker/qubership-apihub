import 'jest-extended'
import { apiDiff, breaking, nonBreaking, risky } from '../src'
import type { Diff, DiffRemove } from '../src'
import { DiffAction } from '../src/core'
import { customScopeSpec } from './helper/customScope'

const createSpec = (properties: Record<string, unknown>): unknown =>
  customScopeSpec(['/first', '/second'], properties)

const before = createSpec({ keep: { type: 'string' }, gone: { type: 'string', deprecated: true } })
const after = createSpec({ keep: { type: 'string' } })

const TAMPERED = 'written by a rule'

const isDeprecatedRemoval = (diff: Diff): diff is DiffRemove =>
  diff.action === DiffAction.remove &&
  diff.type === breaking &&
  !!diff.beforeValue &&
  typeof diff.beforeValue === 'object' &&
  'deprecated' in diff.beforeValue

describe('reclassificationRules', () => {
  it('should replace the classification of the difference a rule claims', () => {
    const { diffs } = apiDiff(before, after, {
      reclassificationRules: [(diff) => (isDeprecatedRemoval(diff) ? risky : undefined)],
    })

    expect(diffs.filter(diff => diff.type === breaking)).toBeEmpty()
    expect(diffs.filter(diff => diff.type === risky)).not.toBeEmpty()
  })

  it('should keep the computed classification when every rule declines', () => {
    const { diffs: offered } = apiDiff(before, after, { reclassificationRules: [() => undefined] })
    const { diffs: untouched } = apiDiff(before, after, {})

    expect(offered.map(({ type, scope }) => ({ type, scope })))
      .toIncludeSameMembers(untouched.map(({ type, scope }) => ({ type, scope })))
  })

  it('should keep the computed classification when a rule throws', () => {
    const errors: string[] = []
    const { diffs: survived } = apiDiff(before, after, {
      reclassificationRules: [() => { throw new Error('rule is broken') }],
      onCreateDiffError: (message) => { errors.push(message) },
    })
    const { diffs: untouched } = apiDiff(before, after, {})

    // Sharing one assignment with the spec rules would leave every difference `unclassified` instead
    expect(survived.map(({ type, scope }) => ({ type, scope })))
      .toIncludeSameMembers(untouched.map(({ type, scope }) => ({ type, scope })))
    expect(errors.join('\n')).toContain('rule is broken')
  })

  it('should guard each rule on its own, keeping the verdict a throwing one interrupted', () => {
    const errors: string[] = []
    const { diffs } = apiDiff(before, after, {
      reclassificationRules: [
        (diff) => (isDeprecatedRemoval(diff) ? risky : undefined),
        () => { throw new Error('rule is broken') },
        (diff) => (diff.type === risky ? nonBreaking : undefined),
      ],
      onCreateDiffError: (message) => { errors.push(message) },
    })

    // One guard around the whole loop would lose the first verdict and skip every rule after the throw
    expect(diffs.filter(diff => diff.type === nonBreaking)).not.toBeEmpty()
    expect(diffs.filter(diff => diff.type === risky)).toBeEmpty()
    expect(errors.join('\n')).toContain('rule is broken')
  })

  it('should consult the rules in the order they are given', () => {
    const { diffs } = apiDiff(before, after, {
      reclassificationRules: [
        (diff) => (isDeprecatedRemoval(diff) ? risky : undefined),
        (diff) => (diff.type === risky ? breaking : undefined),
      ],
    })

    // The second rule sees what the first left, so the last word on a claimed difference is its own
    expect(diffs.filter(diff => diff.type === risky)).toBeEmpty()
  })

  it('should receive the declaration paths and value of the difference', () => {
    const offered: Diff[] = []
    apiDiff(before, after, {
      reclassificationRules: [(diff) => {
        offered.push(diff)
        return undefined
      }],
    })

    const removal = offered.find(diff => isDeprecatedRemoval(diff)) as DiffRemove | undefined
    expect(removal).toBeDefined()
    expect(removal?.beforeDeclarationPaths).toEqual([['components', 'schemas', 'Shared', 'properties', 'gone']])
    expect(removal?.beforeValue).toEqual(expect.objectContaining({ deprecated: true }))
  })

  it('should leave the difference under construction alone when a rule writes to the copy it is given', () => {
    const { diffs } = apiDiff(before, after, {
      reclassificationRules: [(diff) => {
        // `scope` is the probe: unlike `type` and `description`, nothing assigns it after the pipeline, so
        // handing a rule the live difference instead of a copy would leave this write in the result
        diff.scope = TAMPERED
        return undefined
      }],
    })

    expect(diffs).not.toBeEmpty()
    expect(diffs.map(({ scope }) => scope)).not.toContain(TAMPERED)
  })
})
