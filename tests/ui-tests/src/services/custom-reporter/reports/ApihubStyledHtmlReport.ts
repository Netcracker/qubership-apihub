import type { ReportRunResult, ReportTemplateContext, ReportTestInfo } from '../types'
import { getSysInfo } from '@test-data/props'
import BaseReport from './BaseReport'
import { formatTemplate, getAffectRatio, loadFileForReport } from '../utils'
import process from 'node:process'

export default class ApihubStyledHtmlReport extends BaseReport {

  constructor(readonly runResult: ReportRunResult) {
    super()
  }

  async getReport(): Promise<string> {
    const sysInfo = await getSysInfo()
    const htmlTemplate = loadFileForReport('html-apihub-styled/template.html')
    const templateKeys: ReportTemplateContext = {
      status: this.getStatus(),
      startTime: this.runResult.startTime,
      duration: this.runResult.duration,
      workers: this.runResult.workers,
      allTests: this.runResult.counts.allTests,
      executedTests: this.runResult.counts.executedTests,
      passedTests: this.runResult.counts.passedTests,
      failedTests: this.runResult.counts.failedTests,
      flakyTests: this.runResult.counts.flakyTests,
      affectedTests: this.runResult.counts.affectedTests,
      skippedTests: this.runResult.counts.skippedTests,
      style: `<style>${loadFileForReport('html-apihub-styled/style.css')}</style>`,
      ratio: this.getRatio(),
      envName: sysInfo.environment,
      backendVersion: sysInfo.build.backendVersion,
      frontendVersion: sysInfo.build.frontendVersion,
      pwBranch: process.env.CI_PW_BRANCH || '-',
      ciJobLink: process.env.CI_JOB_LINK ? `<a class="link" href="${process.env.CI_JOB_LINK}">#${process.env.CI_JOB_NUMBER}</a>` : '-',
      ciUser: process.env.CI_USER || '-',
      failedTable: this.failedTable() || '',
      flakyTable: this.flakyTable() || '',
      affectedTable: this.affectedTable() || '',
      skippedTable: this.skippedTable() || '',
    }
    return formatTemplate(htmlTemplate, templateKeys)
  }

  protected getStatus(): string {
    let statusHtml: string = 'Undefined'
    switch (this.runResult.status) {
      case 'Passed': {
        statusHtml = '<span class="type-green">●</span> Passed'
        break
      }
      case 'Failed': {
        statusHtml = '<span class="type-red">●</span> Failed'
        break
      }
      case 'Timed out': {
        statusHtml = '<span class="type-orange">●</span> Timed out'
        break
      }
      case 'Interrupted': {
        statusHtml = '<span class="type-orange">●</span> Interrupted'
        break
      }
    }
    return statusHtml
  }

  protected getRatio(): string {
    const _ratio = getAffectRatio(this.runResult)
    let ratio: string
    if (_ratio <= 20) {
      ratio = `<span class="type-green">●</span> ${_ratio}%`
    } else if (_ratio <= 30) {
      ratio = `<span class="type-orange">●</span> ${_ratio}%`
    } else {
      ratio = `<span class="type-red">●</span> ${_ratio}%`
    }

    return ratio
  }

  protected failedTable(): string | undefined {
    if (this.runResult.lists.failedList.size !== 0) {
      return (
        `<tr>
          <td colspan="2" style="padding: 20px 0px 10px 0px" class="result-type-title">
            <span class="type-red">●</span> Failed tests
          </td>
        </tr>
        ${this.getTestsList(this.runResult.lists.failedList)}`
      )
    }
    return
  }

  protected flakyTable(): string | undefined {
    if (this.runResult.lists.flakyList.size !== 0) {
      return (
        `<tr>
          <td colspan="2" style="padding: 20px 0px 10px 0px" class="result-type-title">
            <span class="type-orange">●</span> Flaky tests
          </td>
        </tr>
        ${this.getTestsList(this.runResult.lists.flakyList)}`
      )
    }
    return
  }

  protected affectedTable(): string | undefined {
    if (this.runResult.lists.affectedList.size !== 0) {
      return (
        `<tr>
          <td colspan="2" style="padding: 20px 0px 10px 0px" class="result-type-title">
            <span class="type-purple">●</span> Affected tests
          </td>
        </tr>
        ${this.getTestsList(this.runResult.lists.affectedList)}`
      )
    }
    return
  }

  protected skippedTable(): string | undefined {
    if (this.runResult.lists.skippedList.size !== 0) {
      return (
        `<tr>
          <td colspan="2" style="padding: 20px 0px 10px 0px" class="result-type-title">
            <span class="type-blue">●</span> Skipped tests
          </td>
        </tr>
        ${this.getTestsList(this.runResult.lists.skippedList)}`
      )
    }
    return
  }

  protected getTestsList(list: Map<string, ReportTestInfo>): string {
    let rows = ''

    list.forEach(test => {
      const testTitle = test.testCaseUrl ? `<a class="link" href="${test.testCaseUrl}">${test.fullTitle}</a>` : test.fullTitle

      let issues = ''
      test.issues?.forEach(issue => {
        issues = issue.url ? `${issues}, <a class="link" href="${issue.url}">${issue.key}</a>` : `${issues}, ${issue.key}`
      })

      issues = issues.replace(', ', '')
      rows = `${rows}
      <tr><td class="test-cell">${testTitle}</td><td class="bugs-cell">${issues}</td></tr>`
    })

    return rows
  }
}
