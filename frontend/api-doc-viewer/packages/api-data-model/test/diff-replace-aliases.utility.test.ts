import { breaking, DiffAction, DiffAdd, DiffRemove, DiffRename, DiffReplace } from '@netcracker/qubership-apihub-api-diff'
import { applyDiffReplaceAlias } from '../src/diff-replace-aliases.utility'

const TEST_DIFF_REPLACE_ALIAS = {
  [DiffAction.add]: { beforeValue: 'blabla', afterValue: 1234 },
  [DiffAction.remove]: { beforeValue: 7777, afterValue: true },
}

describe('diff replace aliases', () => {
  it('no diff', () => {
    const actual = applyDiffReplaceAlias(TEST_DIFF_REPLACE_ALIAS)
    expect(actual).toBe(undefined)
  })

  it('already diff add', () => {
    const expected: DiffAdd = {
      type: breaking,
      action: DiffAction.add,
      afterValue: 0,
      afterDeclarationPaths: [],
      scope: '',
    }
    const actual = applyDiffReplaceAlias(TEST_DIFF_REPLACE_ALIAS, expected)
    expect(actual).toBe(expected)
  })

  it('already diff remove', () => {
    const expected: DiffRemove = {
      type: breaking,
      action: DiffAction.remove,
      beforeValue: 0,
      beforeDeclarationPaths: [],
      scope: '',
    }
    const actual = applyDiffReplaceAlias(TEST_DIFF_REPLACE_ALIAS, expected)
    expect(actual).toBe(expected)
  })

  it('diff remame', () => {
    const expected: DiffRename = {
      type: breaking,
      action: DiffAction.rename,
      beforeDeclarationPaths: [],
      beforeKey: 1,
      afterDeclarationPaths: [],
      afterKey: 2,
      scope: '',
    }
    const actual = applyDiffReplaceAlias(TEST_DIFF_REPLACE_ALIAS, expected)
    expect(actual).toBe(expected)
  })

  it('diff replace to add, matches with alias', () => {
    const diff: DiffReplace = {
      type: breaking,
      action: DiffAction.replace,
      beforeValue: 'blabla',
      beforeDeclarationPaths: [],
      afterValue: 1234,
      afterDeclarationPaths: [],
      scope: '',
    }
    const actual = applyDiffReplaceAlias(TEST_DIFF_REPLACE_ALIAS, diff)
    expect(actual).toHaveProperty('action', DiffAction.add)
    expect(actual).toHaveProperty('afterValue', 1234)
    expect(actual).toHaveProperty('afterDeclarationPaths', [])
    expect(actual).not.toHaveProperty('beforeValue')
    expect(actual).not.toHaveProperty('beforeDeclarationPaths')
  })

  it('diff replace to remove, matches with alias', () => {
    const diff: DiffReplace = {
      type: breaking,
      action: DiffAction.replace,
      afterValue: true,
      afterDeclarationPaths: [],
      beforeValue: 7777,
      beforeDeclarationPaths: [],
      scope: '',
    }
    const actual = applyDiffReplaceAlias(TEST_DIFF_REPLACE_ALIAS, diff)
    expect(actual).toHaveProperty('action', DiffAction.remove)
    expect(actual).toHaveProperty('beforeValue', 7777)
    expect(actual).toHaveProperty('beforeDeclarationPaths', [])
    expect(actual).not.toHaveProperty('afterValue')
    expect(actual).not.toHaveProperty('afterDeclarationPaths')
  })

  it('diff replace to add, DOES NOT match with alias', () => {
    const diff: DiffReplace = {
      type: breaking,
      action: DiffAction.replace,
      beforeValue: 'abcd',
      beforeDeclarationPaths: [],
      afterValue: 1234,
      afterDeclarationPaths: [],
      scope: '',
    }
    const actual = applyDiffReplaceAlias(TEST_DIFF_REPLACE_ALIAS, diff)
    expect(actual).toBe(undefined)
  })

  it('diff replace to remove, matches with alias', () => {
    const diff: DiffReplace = {
      type: breaking,
      action: DiffAction.replace,
      afterValue: true,
      afterDeclarationPaths: [],
      beforeValue: 8888,
      beforeDeclarationPaths: [],
      scope: '',
    }
    const actual = applyDiffReplaceAlias(TEST_DIFF_REPLACE_ALIAS, diff)
    expect(actual).toBe(undefined)
  })
})
