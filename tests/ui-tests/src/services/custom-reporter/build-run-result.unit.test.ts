import { expect, test } from '@playwright/test'
import { buildRunResult } from './build-run-result'
import {
  buildRunResultFromCases,
  createMockFullResult,
  createMockSuite,
  createMockTestCase,
  createMockTestResult,
} from './custom-reporter.test-helpers'

test.describe('buildRunResult unit tests', () => {
  test('does not count not-run tests as passed when interrupted', () => {
    const executed = createMockTestCase({ project: 'Portal', title: 'ran', outcome: 'expected' })
    const notRun = createMockTestCase({
      project: 'Portal',
      title: 'never ran',
      outcome: 'expected',
      results: [],
    })

    const result = buildRunResultFromCases([executed, notRun], 'interrupted')

    expect.soft(result.counts.allTests).toBe(2)
    expect.soft(result.counts.executedTests).toBe(1)
    expect.soft(result.counts.passedTests).toBe(1)
    expect.soft(result.counts.failedTests).toBe(0)
  })

  test('uses final flaky outcome instead of counting a failure', () => {
    const flaky = createMockTestCase({
      project: 'Portal',
      title: 'flaky',
      outcome: 'flaky',
      results: [
        createMockTestResult(0, [{ message: 'first try failed', stack: 'stack' }]),
        createMockTestResult(1),
      ],
    })

    const result = buildRunResultFromCases([flaky], 'passed')

    expect.soft(result.counts.failedTests).toBe(0)
    expect.soft(result.counts.flakyTests).toBe(1)
    expect.soft(result.lists.failedList.size).toBe(0)
    expect.soft(result.lists.flakyList.size).toBe(1)
  })

  test('stores only first-attempt errors from test.results[0]', () => {
    const firstError = { message: 'first', stack: 'stack-1' }
    const secondError = { message: 'second', stack: 'stack-2' }
    const failed = createMockTestCase({
      project: 'Portal',
      title: 'failed',
      outcome: 'unexpected',
      results: [
        createMockTestResult(0, [firstError]),
        createMockTestResult(1, [secondError]),
      ],
    })

    const result = buildRunResultFromCases([failed], 'failed')
    const info = [...result.lists.failedList.values()][0]

    expect.soft(result.counts.failedTests).toBe(1)
    expect.soft(info.firstAttemptErrors).toEqual([firstError])
  })

  test('formats FullResult.duration from milliseconds', () => {
    const result = buildRunResult(
      createMockSuite([]),
      createMockFullResult('passed', new Date('2026-07-25T12:00:00.000Z'), 125_000),
      2,
    )

    expect.soft(result.duration).toBe('02:05 (mm:ss)')
    expect.soft(result.workers).toBe(2)
  })
})
