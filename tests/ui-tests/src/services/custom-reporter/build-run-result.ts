import type { FullResult, Suite, TestError } from '@playwright/test/reporter'
import { millisecondsToMmSs } from '@services/utils'
import { SETUP_PROJECTS } from './consts'
import { type ReportRunResult, type ReportTestInfo, RUN_STATUS_LABELS, type TestOutcome } from './types'
import { formatDate, getTestInfo } from './utils'

const SETUP_PROJECT_NAMES = new Set<string>(SETUP_PROJECTS)

function createEmptyLists(): ReportRunResult['lists'] {
  return {
    failedList: new Map(),
    flakyList: new Map(),
    affectedList: new Map(),
    skippedList: new Map(),
  }
}

function addFirstAttemptErrors(testInfo: ReportTestInfo, errors: TestError[] | undefined): void {
  if (errors && errors.length > 0) {
    testInfo.firstAttemptErrors = errors
  }
}

function trackSetupTestLists(testInfo: ReportTestInfo, outcome: TestOutcome, lists: ReportRunResult['lists']): void {
  if (outcome === 'flaky') {
    lists.flakyList.set(testInfo.fullTitle, testInfo)
    return
  }
  if (outcome === 'unexpected') {
    lists.failedList.set(testInfo.fullTitle, testInfo)
  }
}

export function buildRunResult(suite: Suite, fullResult: FullResult, workers: number): ReportRunResult {
  const lists = createEmptyLists()
  const counts: ReportRunResult['counts'] = {
    allTests: 0,
    executedTests: 0,
    passedTests: 0,
    failedTests: 0,
    flakyTests: 0,
    affectedTests: 0,
    skippedTests: 0,
  }

  for (const test of suite.allTests()) {
    const testInfo = getTestInfo(test)
    const isSetupTest = SETUP_PROJECT_NAMES.has(testInfo.project)
    const outcome = test.outcome()
    const hasRun = test.results.length > 0

    addFirstAttemptErrors(testInfo, test.results[0]?.errors)

    if (isSetupTest) {
      trackSetupTestLists(testInfo, outcome, lists)
      continue
    }

    counts.allTests++

    if (!hasRun) {
      continue
    }

    if (outcome !== 'skipped') {
      counts.executedTests++
    }

    switch (outcome) {
      case 'expected': {
        if (testInfo.issues.size > 0) {
          counts.affectedTests++
          lists.affectedList.set(testInfo.fullTitle, testInfo)
        } else {
          counts.passedTests++
        }
        break
      }
      case 'skipped': {
        counts.skippedTests++
        lists.skippedList.set(testInfo.fullTitle, testInfo)
        break
      }
      case 'flaky': {
        counts.flakyTests++
        lists.flakyList.set(testInfo.fullTitle, testInfo)
        break
      }
      case 'unexpected': {
        counts.failedTests++
        lists.failedList.set(testInfo.fullTitle, testInfo)
        break
      }
    }
  }

  return {
    status: RUN_STATUS_LABELS[fullResult.status] ?? 'Unknown',
    startTime: formatDate(fullResult.startTime),
    duration: millisecondsToMmSs(fullResult.duration),
    workers: workers,
    counts: counts,
    lists: lists,
  }
}
