import { expect, test } from '@playwright/test'
import { createEmptyRunResult, createMockTestCase } from './custom-reporter.test-helpers'
import type { ReportTestInfo } from './types'
import { escapeHtml, formatFullTitle, formatHtmlTestRow, getAffectRatio, getTestInfo, safeHttpUrl } from './utils'

test.describe('custom-reporter utils unit tests', () => {
  test.describe('formatFullTitle', () => {
    test('uses the outermost describe after the project', () => {
      expect.soft(formatFullTitle([
        '',
        'Portal',
        'api-quality.spec.ts',
        'API Quality Validation',
        'Ruleset Management',
        'Ruleset Creation',
        'create ruleset',
      ])).toBe('Portal > API Quality Validation > create ruleset')

      expect.soft(
        getTestInfo(createMockTestCase({
          project: 'Portal',
          parentTitle: '03.0 Access Control. General.',
          title: '[P-ACG-01] Roles assignee',
          outcome: 'expected',
        })).fullTitle,
      ).toBe('Portal > 03.0 Access Control. General. > [P-ACG-01] Roles assignee')
    })
  })

  test.describe('getAffectRatio', () => {
    test('calculates ratio from failed, affected, and skipped tests', () => {
      const runResult = {
        ...createEmptyRunResult(),
        counts: {
          allTests: 10,
          executedTests: 10,
          passedTests: 5,
          failedTests: 2,
          flakyTests: 1,
          affectedTests: 3,
          skippedTests: 1,
        },
      }

      expect.soft(getAffectRatio(runResult)).toBe(60)
    })

    test('ignores flaky and passed tests in the numerator', () => {
      const runResult = {
        ...createEmptyRunResult(),
        counts: {
          allTests: 4,
          executedTests: 4,
          passedTests: 2,
          failedTests: 0,
          flakyTests: 2,
          affectedTests: 0,
          skippedTests: 0,
        },
      }

      expect.soft(getAffectRatio(runResult)).toBe(0)
    })

    test('returns 0 when there are no tests', () => {
      const runResult = createEmptyRunResult()
      expect.soft(getAffectRatio(runResult)).toBe(0)
    })
  })

  test.describe('html escaping', () => {
    test('escapeHtml encodes markup characters', () => {
      expect.soft(escapeHtml('<b>"x"&\'</b>')).toBe('&lt;b&gt;&quot;x&quot;&amp;&#39;&lt;/b&gt;')
    })

    test('safeHttpUrl accepts http(s) and rejects other schemes', () => {
      expect.soft(safeHttpUrl('https://example.com/path')).toBe('https://example.com/path')
      expect.soft(safeHttpUrl('javascript:alert(1)')).toBeUndefined()
    })

    test('formatHtmlTestRow escapes titles and drops unsafe links', () => {
      const testInfo: ReportTestInfo = {
        project: 'Portal',
        fullTitle: '<script>alert(1)</script>',
        testCaseUrl: 'javascript:alert(1)',
        issues: new Set([{ key: 'BUG-1<script>', url: 'https://jira.example.com/BUG-1' }]),
        tags: [],
        annotations: [],
      }

      const row = formatHtmlTestRow(testInfo)

      expect.soft(row).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
      expect.soft(row).not.toContain('<script>')
      expect.soft(row).not.toContain('href="javascript:')
      expect.soft(row).toContain('href="https://jira.example.com/BUG-1"')
      expect.soft(row).toContain('BUG-1&lt;script&gt;')
    })
  })
})
