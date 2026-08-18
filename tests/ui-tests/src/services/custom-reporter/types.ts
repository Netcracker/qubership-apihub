import type { FullResult, TestCase, TestError } from '@playwright/test/reporter'

/** Final Playwright verdict after retries. */
export type TestOutcome = ReturnType<TestCase['outcome']>

export const RUN_STATUS_LABELS = {
  passed: 'Passed',
  failed: 'Failed',
  timedout: 'Timed out',
  interrupted: 'Interrupted',
} as const satisfies Record<FullResult['status'], string>

export type RunStatusLabel = (typeof RUN_STATUS_LABELS)[FullResult['status']] | 'Unknown'

export interface TestIssue {
  readonly key: string
  readonly url?: string
}

export interface ReportTestInfo {
  project: string
  fullTitle: string
  testCaseUrl?: string
  issues: Set<TestIssue>
  firstAttemptErrors?: TestError[]
  tags?: string[]
  annotations?: Array<{ type: string; description?: string }>
}

export interface ReportCounts {
  allTests: number
  executedTests: number
  passedTests: number
  failedTests: number
  flakyTests: number
  affectedTests: number
  skippedTests: number
}

export interface ReportTestLists {
  failedList: Map<string, ReportTestInfo>
  flakyList: Map<string, ReportTestInfo>
  affectedList: Map<string, ReportTestInfo>
  skippedList: Map<string, ReportTestInfo>
}

/** Aggregated run data consumed by HTML and GitHub reporters. */
export interface ReportRunResult {
  readonly status: RunStatusLabel
  readonly startTime: string
  readonly duration: string
  readonly workers: number
  readonly counts: ReportCounts
  readonly lists: ReportTestLists
}

export interface ReportTemplateContext extends ReportCounts {
  readonly status: string
  readonly style: string
  readonly ratio: string
  readonly startTime: string
  readonly duration: string
  readonly workers: number
  readonly envName: string
  readonly backendVersion: string
  readonly frontendVersion: string
  readonly pwBranch: string
  readonly ciJobLink: string
  readonly ciUser: string
  readonly failedTable: string
  readonly flakyTable: string
  readonly affectedTable: string
  readonly skippedTable: string
}

export interface GitHubReportOptions {
  readonly title: string
  readonly affectRatio: boolean
}

export interface CustomReporterOptions {
  readonly outputFolder?: string
  readonly html?: boolean
  readonly github?: false | {
    readonly title?: string
    readonly affectRatio?: boolean
  }
}

export interface ResolvedCustomReporterOptions {
  readonly outputFolder: string
  readonly html: boolean
  readonly github: false | GitHubReportOptions
}
