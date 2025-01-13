/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FullConfig, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter'
import type { ReportRunResult, ReportType } from './types'
import ApihubStyledHtmlReport from './reports/ApihubStyledHtmlReport'
import { formatDate, getTestInfo, millisecondsToMinuteSeconds } from './utils'
import { SETUP_PROJECTS } from './consts'
import { mkdirSync, writeFileSync } from 'fs'
import type { FullResult } from 'playwright/types/testReporter'

const initialRunResult = (): ReportRunResult => ({
  status: '',
  startTime: '',
  duration: '',
  workers: 0,
  counts: {
    allTests: 0,
    executedTests: 0,
    passedTests: 0,
    failedTests: 0,
    flakyTests: 0,
    affectedTests: 0,
    skippedTests: 0,
  },
  lists: {
    failedList: new Map(),
    flakyList: new Map(),
    affectedList: new Map(),
    skippedList: new Map(),
  },
})

class CustomReporter implements Reporter {

  readonly reportType = this.options.reportType
  readonly outputFolder = this.options.outputFolder

  private setupTests = 0

  private runResult!: ReportRunResult

  constructor(readonly options: { reportType: ReportType; outputFolder?: string }) { }

  async onBegin(config: FullConfig, suite: Suite): Promise<void> {
    this.runResult = initialRunResult()
    this.runResult.counts.allTests = suite.allTests().length
    this.runResult.workers = config.workers
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    const outcome = test.outcome()
    const { retry } = result
    const testInfo = getTestInfo(test)
    const isSetupTest = SETUP_PROJECTS.includes(testInfo.project)

    const removeFromFailedList = (): void => {
      this.runResult.lists.failedList.delete(testInfo.fullTitle)
      if (!isSetupTest) {
        this.runResult.counts.failedTests--
      }
    }

    switch (outcome) {
      case 'expected': {
        if (isSetupTest) {
          this.setupTests++
        } else if (testInfo.issues.size > 0) {
          this.runResult.counts.affectedTests++
          this.runResult.lists.affectedList.set(testInfo.fullTitle, testInfo)
        } else {
          this.runResult.counts.passedTests++
        }
        break
      }
      case 'skipped': {
        if (isSetupTest) {
          this.setupTests++
        } else {
          this.runResult.counts.skippedTests++
          this.runResult.lists.skippedList.set(testInfo.fullTitle, testInfo)
        }
        break
      }
      case 'flaky': {
        removeFromFailedList()
        this.runResult.lists.flakyList.set(testInfo.fullTitle, testInfo)
        isSetupTest ? this.setupTests++ : this.runResult.counts.flakyTests++
        break
      }
      case 'unexpected':
        if (retry === 0) {
          this.runResult.lists.failedList.set(testInfo.fullTitle, testInfo)
          isSetupTest ? this.setupTests++ : this.runResult.counts.failedTests++
        }
        break
    }

    if (retry === 0 && outcome !== 'skipped' && !isSetupTest) {
      this.runResult.counts.executedTests++
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    this.runResult.startTime = formatDate(result.startTime)
    this.runResult.duration = millisecondsToMinuteSeconds(result.duration) //since playwright v1.38.0
    this.runResult.counts.allTests -= this.setupTests
    switch (result.status) {
      case 'passed': {
        this.runResult.status = 'Passed'
        break
      }
      case 'failed': {
        this.runResult.status = 'Failed'
        break
      }
      case 'timedout': {
        this.runResult.status = 'Timed out'
        break
      }
      case 'interrupted': {
        this.runResult.status = 'Interrupted'
        break
      }
    }
    await outputReport(this.runResult, this.reportType, this.outputFolder)
  }
}

async function outputReport(runResult: ReportRunResult, reportType: ReportType, outputFolder = 'reports/summary'): Promise<void> {

  const getReportByType = async (_reportType: ReportType): Promise<string> => {
    switch (_reportType) {
      case 'apihub-styled-html': {
        return new ApihubStyledHtmlReport(runResult).getReport()
      }
      default: {
        throw new Error(`Invalid report type: "${reportType}" `)
      }
    }
  }

  mkdirSync(outputFolder, { recursive: true })
  writeFileSync(`${outputFolder}/summary-report.html`, await getReportByType(reportType))
  writeFileSync(`${outputFolder}/status`, runResult.status)
}

export default CustomReporter
