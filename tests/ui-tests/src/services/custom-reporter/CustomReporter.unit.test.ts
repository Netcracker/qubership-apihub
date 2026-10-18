import { expect, test } from '@playwright/test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { createMockTestCase, createMockTestResult, runReporterLifecycle } from './custom-reporter.test-helpers'
import CustomReporter from './CustomReporter'

test.describe('CustomReporter unit tests', () => {
  test.describe('run status', () => {
    test('writes mapped status to output file', async () => {
      const outputFolder = mkdtempSync(join(tmpdir(), 'custom-reporter-status-'))
      const reporter = new CustomReporter({ html: false, outputFolder: outputFolder })
      const testCase = createMockTestCase({
        project: 'Portal',
        title: 'sample test',
        outcome: 'expected',
      })

      await runReporterLifecycle({
        reporter: reporter,
        testCases: [testCase],
        fullResultStatus: 'passed',
      })

      expect.soft(readFileSync(join(outputFolder, 'status'), 'utf8')).toBe('Passed')
      rmSync(outputFolder, { recursive: true, force: true })
    })

    const statusCases: Array<{ playwrightStatus: 'passed' | 'failed' | 'timedout' | 'interrupted'; expected: string }> =
      [
        { playwrightStatus: 'passed', expected: 'Passed' },
        { playwrightStatus: 'failed', expected: 'Failed' },
        { playwrightStatus: 'timedout', expected: 'Timed out' },
        { playwrightStatus: 'interrupted', expected: 'Interrupted' },
      ]

    for (const { playwrightStatus, expected } of statusCases) {
      test(`maps Playwright "${playwrightStatus}" to "${expected}"`, async () => {
        const reporter = new CustomReporter({ html: false })
        const testCase = createMockTestCase({
          project: 'Portal',
          title: 'sample test',
          outcome: 'expected',
        })

        const runResult = await runReporterLifecycle({
          reporter: reporter,
          testCases: [testCase],
          fullResultStatus: playwrightStatus,
        })

        expect.soft(runResult.status).toBe(expected)
      })
    }
  })

  test.describe('test counts', () => {
    test('returns zero counts for an empty run', async () => {
      const reporter = new CustomReporter({ html: false })

      const runResult = await runReporterLifecycle({
        reporter: reporter,
        testCases: [],
        fullResultStatus: 'passed',
      })

      expect.soft(runResult.status).toBe('Passed')
      expect.soft(runResult.counts).toEqual({
        allTests: 0,
        executedTests: 0,
        passedTests: 0,
        failedTests: 0,
        flakyTests: 0,
        affectedTests: 0,
        skippedTests: 0,
      })
    })

    test('counts allTests including skipped tests but excludes skipped from executedTests', async () => {
      const passed = createMockTestCase({ project: 'Portal', title: 'passed test', outcome: 'expected' })
      const skipped = createMockTestCase({ project: 'Portal', title: 'skipped test', outcome: 'skipped' })
      const failed = createMockTestCase({
        project: 'Portal',
        title: 'failed test',
        outcome: 'unexpected',
        results: [createMockTestResult(0, [{ message: 'boom', stack: 'stack' }])],
      })
      const reporter = new CustomReporter({ html: false })

      const runResult = await runReporterLifecycle({
        reporter: reporter,
        testCases: [passed, skipped, failed],
        fullResultStatus: 'failed',
      })

      expect.soft(runResult.counts).toEqual({
        allTests: 3,
        executedTests: 2,
        passedTests: 1,
        failedTests: 1,
        flakyTests: 0,
        affectedTests: 0,
        skippedTests: 1,
      })
      expect.soft(runResult.lists.failedList.size).toBe(1)
      expect.soft(runResult.lists.skippedList.size).toBe(1)
    })

    test('counts affected tests when expected outcome has linked issues', async () => {
      const affected = createMockTestCase({
        project: 'Portal',
        title: 'known issue test',
        outcome: 'expected',
        annotations: [{ type: 'Issue', description: 'APIHUB-123' }],
      })
      const reporter = new CustomReporter({ html: false })

      const runResult = await runReporterLifecycle({
        reporter: reporter,
        testCases: [affected],
        fullResultStatus: 'passed',
      })

      expect.soft(runResult.counts.passedTests).toBe(0)
      expect.soft(runResult.counts.affectedTests).toBe(1)
      expect.soft(runResult.lists.affectedList.size).toBe(1)
    })

    test('excludes setup projects from category counts and allTests total', async () => {
      const setupPassed = createMockTestCase({
        project: 'Portal-Setup',
        title: 'setup step',
        outcome: 'expected',
      })
      const setupFailed = createMockTestCase({
        project: 'Apihub-Setup',
        title: 'setup failure',
        outcome: 'unexpected',
        results: [createMockTestResult(0, [{ message: 'setup failed', stack: 'stack' }])],
      })
      const portalPassed = createMockTestCase({
        project: 'Portal',
        title: 'portal test',
        outcome: 'expected',
      })
      const reporter = new CustomReporter({ html: false })

      const runResult = await runReporterLifecycle({
        reporter: reporter,
        testCases: [setupPassed, setupFailed, portalPassed],
        fullResultStatus: 'failed',
      })

      expect.soft(runResult.counts.allTests).toBe(1)
      expect.soft(runResult.counts.passedTests).toBe(1)
      expect.soft(runResult.counts.failedTests).toBe(0)
      expect.soft(runResult.counts.executedTests).toBe(1)
    })

    test('counts setup skipped tests toward setup total instead of skipped category', async () => {
      const setupSkipped = createMockTestCase({
        project: 'Portal-Setup',
        title: 'skipped setup step',
        outcome: 'skipped',
      })
      const reporter = new CustomReporter({ html: false })

      const runResult = await runReporterLifecycle({
        reporter: reporter,
        testCases: [setupSkipped],
        fullResultStatus: 'passed',
      })

      expect.soft(runResult.counts.allTests).toBe(0)
      expect.soft(runResult.counts.skippedTests).toBe(0)
      expect.soft(runResult.counts.executedTests).toBe(0)
      expect.soft(runResult.lists.skippedList.size).toBe(0)
    })

    test('counts setup flaky tests toward setup total instead of flaky category', async () => {
      const setupFlaky = createMockTestCase({
        project: 'Portal-Setup',
        title: 'flaky setup step',
        outcome: 'flaky',
        results: [
          createMockTestResult(0, [{ message: 'setup failed', stack: 'stack' }]),
          createMockTestResult(1),
        ],
      })
      const reporter = new CustomReporter({ html: false })

      const runResult = await runReporterLifecycle({
        reporter: reporter,
        testCases: [setupFlaky],
        fullResultStatus: 'passed',
      })

      expect.soft(runResult.counts.allTests).toBe(0)
      expect.soft(runResult.counts.flakyTests).toBe(0)
      expect.soft(runResult.counts.failedTests).toBe(0)
      expect.soft(runResult.counts.executedTests).toBe(0)
      expect.soft(runResult.lists.flakyList.size).toBe(1)
    })
  })

  test('skips HTML report for unit-only suites even when html is true', async () => {
    const outputFolder = mkdtempSync(join(tmpdir(), 'custom-reporter-unit-html-'))
    const reporter = new CustomReporter({ html: true, outputFolder: outputFolder })
    const testCase = createMockTestCase({
      project: 'Unit',
      title: 'sample unit test',
      outcome: 'expected',
      file: 'sample.unit.test.ts',
    })

    await runReporterLifecycle({
      reporter: reporter,
      testCases: [testCase],
      fullResultStatus: 'passed',
    })

    expect.soft(readFileSync(join(outputFolder, 'status'), 'utf8')).toBe('Passed')
    expect.soft(existsSync(join(outputFolder, 'summary-report.html'))).toBe(false)
    rmSync(outputFolder, { recursive: true, force: true })
  })
})
