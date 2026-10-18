import { expect, test } from '@playwright/test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createEmptyCounts, createEmptyRunResult } from '../custom-reporter.test-helpers'
import type { ReportRunResult, ReportTestInfo } from '../types'
import GitHubActionsReport, { buildGitHubSummaryTable } from './GitHubActionsReport'

const githubOptions = { title: 'UI E2E tests result', affectRatio: false }

function summaryRowLabels(rows: ReturnType<typeof buildGitHubSummaryTable>): string[] {
  return rows.map(row => row[0]?.data ?? '')
}

test.describe('GitHubActionsReport', () => {
  test.describe('buildGitHubSummaryTable', () => {
    test('always shows Executed and hides zero-count categories', () => {
      const runResult = {
        ...createEmptyRunResult('Passed'),
        counts: {
          ...createEmptyCounts(),
          allTests: 3,
          executedTests: 3,
          passedTests: 3,
        },
      }

      const labels = summaryRowLabels(buildGitHubSummaryTable(runResult, githubOptions))

      expect.soft(labels).toContain('Executed')
      expect.soft(labels).not.toContain('Skipped')
      expect.soft(labels).not.toContain('Flaky')
      expect.soft(labels).not.toContain('Failed')
    })

    test('shows only non-zero outcome categories', () => {
      const runResult = {
        ...createEmptyRunResult('Failed'),
        counts: {
          ...createEmptyCounts(),
          allTests: 4,
          executedTests: 3,
          passedTests: 1,
          failedTests: 1,
          flakyTests: 1,
          skippedTests: 1,
        },
      }

      const labels = summaryRowLabels(buildGitHubSummaryTable(runResult, githubOptions))

      expect.soft(labels).toEqual(['Summary', 'Status', 'Executed', 'Skipped', 'Flaky', 'Failed'])
    })
  })

  test.describe('write', () => {
    test.describe.configure({ mode: 'serial' })

    // @actions/core caches GITHUB_STEP_SUMMARY on first write(); reuse one file for this describe.
    let outputFolder: string | undefined
    let summaryFile = ''
    let previousStepSummary: string | undefined

    test.beforeAll(() => {
      outputFolder = mkdtempSync(join(tmpdir(), 'gh-step-summary-'))
      summaryFile = join(outputFolder, 'summary.md')
      writeFileSync(summaryFile, '')
      previousStepSummary = process.env.GITHUB_STEP_SUMMARY
      process.env.GITHUB_STEP_SUMMARY = summaryFile
    })

    test.beforeEach(() => {
      writeFileSync(summaryFile, '')
    })

    test.afterAll(() => {
      if (previousStepSummary === undefined) {
        delete process.env.GITHUB_STEP_SUMMARY
      } else {
        process.env.GITHUB_STEP_SUMMARY = previousStepSummary
      }
      if (outputFolder !== undefined) {
        rmSync(outputFolder, { recursive: true, force: true })
      }
    })

    test('renders failed-test details with escaped HTML, tags, and errors', async () => {
      const fullTitle = 'Foo </summary><b>bar'
      const testInfo: ReportTestInfo = {
        project: 'portal',
        fullTitle: fullTitle,
        issues: new Set(),
        tags: ['@smoke', '@portal'],
        annotations: [{ type: 'Note', description: '<script>x</script>' }],
        firstAttemptErrors: [{ stack: 'Error: boom\n    at foo.spec.ts:10:5' }],
      }
      const runResult: ReportRunResult = {
        ...createEmptyRunResult('Failed'),
        counts: {
          ...createEmptyCounts(),
          allTests: 1,
          executedTests: 1,
          failedTests: 1,
        },
        lists: {
          ...createEmptyRunResult('Failed').lists,
          failedList: new Map([[fullTitle, testInfo]]),
        },
      }

      const markdown = await new GitHubActionsReport(runResult, githubOptions).write()

      expect.soft(markdown).toContain('Failed Tests')
      expect.soft(markdown).toContain('**Tags:** `@smoke` `@portal`')
      expect.soft(markdown).toContain('```\nError: boom')
      expect.soft(markdown).toContain('Foo &lt;/summary&gt;&lt;b&gt;bar')
      expect.soft(markdown).toContain('&lt;script&gt;x&lt;/script&gt;')
      expect.soft(markdown).not.toContain('</summary><b>bar')
    })

    test('writes summary markdown to GITHUB_STEP_SUMMARY', async () => {
      const markdown = await new GitHubActionsReport(
        createEmptyRunResult('Failed'),
        githubOptions,
      ).write()

      expect.soft(markdown).toContain('UI E2E tests result')
      expect.soft(markdown).toContain('Failed')
      expect.soft(readFileSync(summaryFile, 'utf8')).toContain('UI E2E tests result')
    })
  })
})
