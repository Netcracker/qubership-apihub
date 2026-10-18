import { getNodeRules } from '../src/rules'
import { CrawlRules } from '../src/types'

type TestRules = {
  rule?: string
  keyWas?: any
  valueWas?: any
}

describe('Prefix Rules', () => {
  it('should apply prefix rules when key starts with prefix', () => {
    const rules = {
      '/**': { rule: 'global' },
      '/*': { rule: 'local' },
      '/^': {
        'test': { rule: 'prefix' },
        'test_': { rule: 'specificPrefix' }
      },
      '/testSpecific': { rule: 'specific' }
    } as CrawlRules<TestRules>

    // Test exact match - should use specific rule (highest priority)
    const specificResult = getNodeRules(rules, 'testSpecific', ['testSpecific'], 'value')
    expect(specificResult!.rule).toBe('specific')

    // Test prefix match - should use prefix rule
    const prefixResult = getNodeRules(rules, 'testSomething', ['testSomething'], 'value')
    expect(prefixResult!.rule).toBe('prefix')

    // Test longest prefix wins
    const longestPrefixResult = getNodeRules(rules, 'test_something', ['test_something'], 'value')
    expect(longestPrefixResult!.rule).toBe('specificPrefix')

    // Test no prefix match - should use local rule (no specific rule defined)
    const noMatchResult = getNodeRules(rules, 'other', ['other'], 'value')
    expect(noMatchResult!.rule).toBe('local')
  })

  it('should propagate global rules correctly', () => {
    const rules = {
      '/**': { rule: 'global' },
      '/*': { rule: 'local' },
      '/testSpecific': { rule: 'specific' }
    } as CrawlRules<TestRules>

    const result = getNodeRules(rules, 'testSpecific', ['testSpecific'], 'value')
    expect(result).toEqual({
      '/**': { rule: 'global' },
      rule: 'specific'
    })
  })

  it('should handle empty prefix rules', () => {
    const rules = {
      '/*': { rule: 'local' },
      '/^': {}
    } as CrawlRules<TestRules>

    const result = getNodeRules(rules, 'testKey', ['testKey'], 'value')
    expect(result!.rule).toBe('local')
  })

  it('should ignore empty string prefixes', () => {
    const rules = {
      '/*': { rule: 'local' },
      '/^': {
        '': { rule: 'emptyPrefix' },
        'test': { rule: 'validPrefix' }
      }
    } as CrawlRules<TestRules>

    const result = getNodeRules(rules, 'testKey', ['testKey'], 'value')
    expect(result!.rule).toBe('validPrefix')
  })

  it('should handle functional prefix rules', () => {
    const rules = {
      '/*': { rule: 'local' },
      '/^': ({ key }) => ({
        'test': { rule: 'dynamicPrefix', keyWas: key }
      })
    } as CrawlRules<TestRules>

    const result = getNodeRules(rules, 'testDynamic', ['testDynamic'], 'value')
    expect(result).toEqual({
      rule: 'dynamicPrefix',
      keyWas: 'testDynamic'
    })
  })

  it('should handle functional individual prefix rule', () => {
    const rules = {
      '/*': { rule: 'local' },
      '/^': {
        'test': ({ key, value }) => ({ rule: 'dynamicRule', keyWas: key, valueWas: value })
      }
    } as CrawlRules<TestRules>

    const result = getNodeRules(rules, 'testValue', ['testValue'], 'someValue')
    expect(result).toEqual({
      rule: 'dynamicRule',
      keyWas: 'testValue',
      valueWas: 'someValue'
    })
  })
}) 