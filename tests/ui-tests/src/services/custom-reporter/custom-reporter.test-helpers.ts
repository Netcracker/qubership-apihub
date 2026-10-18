import type { FullResult, Suite, TestCase, TestResult } from '@playwright/test/reporter'
import { buildRunResult } from './build-run-result'
import type CustomReporter from './CustomReporter'
import type { ReportCounts, ReportRunResult, RunStatusLabel } from './types'

export type MockTestCaseParams = {
  project: string
  parentTitle?: string
  title: string
  outcome: ReturnType<TestCase['outcome']>
  results?: TestResult[]
  tags?: string[]
  annotations?: Array<{ type: string; description?: string }>
  file?: string
}

export function createMockTestCase(params: MockTestCaseParams): TestCase {
  const parentTitle = params.parentTitle ?? 'describe block'
  const { outcome } = params
  const results = params.results ?? [createMockTestResult(0)]
  const file = params.file ?? 'mock.spec.ts'
  // Mirrors Playwright titlePath: ['', project, file, ...describes, testTitle]
  const titlePath = ['', params.project, file, parentTitle, params.title]
  return {
    outcome: () => outcome,
    results: results,
    titlePath: () => titlePath,
    parent: { title: parentTitle },
    title: params.title,
    tags: params.tags ?? [],
    annotations: params.annotations ?? [],
    location: { file: file },
  } as unknown as TestCase
}

export function createMockTestResult(retry: number, errors: TestResult['errors'] = []): TestResult {
  return {
    retry: retry,
    errors: errors,
    status: errors.length > 0 ? 'failed' : 'passed',
    duration: 100,
    stdout: [],
    stderr: [],
    attachments: [],
    startTime: new Date(),
  } as unknown as TestResult
}

export function createMockSuite(testCases: TestCase[]): Suite {
  return {
    allTests: () => testCases,
  } as unknown as Suite
}

export function createMockFullResult(
  status: FullResult['status'],
  startTime = new Date('2026-07-25T12:00:00.000Z'),
  duration = 125_000,
): FullResult {
  return {
    status: status,
    startTime: startTime,
    duration: duration,
  } as FullResult
}

export function buildRunResultFromCases(
  testCases: TestCase[],
  fullResultStatus: FullResult['status'],
  workers = 3,
): ReportRunResult {
  return buildRunResult(createMockSuite(testCases), createMockFullResult(fullResultStatus), workers)
}

export async function runReporterLifecycle(options: {
  reporter: CustomReporter
  testCases: TestCase[]
  fullResultStatus: FullResult['status']
  workers?: number
}): Promise<ReportRunResult> {
  const { reporter, testCases, fullResultStatus, workers = 3 } = options
  const suite = createMockSuite(testCases)
  const fullResult = createMockFullResult(fullResultStatus)
  await reporter.onBegin({ workers } as never, suite)
  await reporter.onEnd(fullResult)
  return buildRunResult(suite, fullResult, workers)
}

export function createEmptyCounts(): ReportCounts {
  return {
    allTests: 0,
    executedTests: 0,
    passedTests: 0,
    failedTests: 0,
    flakyTests: 0,
    affectedTests: 0,
    skippedTests: 0,
  }
}

export function createEmptyRunResult(status: RunStatusLabel = 'Passed'): ReportRunResult {
  return {
    status: status,
    startTime: 'Sat, Jul 25, 2026, 15:00:00 GMT+3',
    duration: '02:05 (mm:ss)',
    workers: 3,
    counts: createEmptyCounts(),
    lists: {
      failedList: new Map(),
      flakyList: new Map(),
      affectedList: new Map(),
      skippedList: new Map(),
    },
  }
}
