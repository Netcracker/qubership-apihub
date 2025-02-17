export type ReportType = 'apihub-styled-html'

export type ReportRunResult = {
  status: string
  startTime: string
  duration: string
  workers: number
  counts: ReportRunResultCounts
  lists: ReportRunResultLists
}

export type ReportRunResultCounts = {
  allTests: number
  executedTests: number
  passedTests: number
  failedTests: number
  flakyTests: number
  affectedTests: number
  skippedTests: number
}

export type ReportRunResultLists = {
  failedList: Map<string, ReportTestInfo>
  flakyList: Map<string, ReportTestInfo>
  affectedList: Map<string, ReportTestInfo>
  skippedList: Map<string, ReportTestInfo>
}

export type ReportTemplateContext = Omit<ReportRunResult, 'counts' | 'lists'> & ReportRunResultCounts & {
  style: string
  ratio: string
  envName: string
  backendVersion: string
  frontendVersion: string
  pwBranch: string
  ciJobLink: string
  ciUser: string
  failedTable: string
  flakyTable: string
  affectedTable: string
  skippedTable: string
}

export type ReportTestInfo = {
  project: string
  fullTitle: string
  testCaseUrl?: string
  issues: ReportTestIssues
}

export type ReportTestIssues = Set<{
  key: string
  url?: string
}>
