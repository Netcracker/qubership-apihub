/**
 * Builds the CI summary HTML artefact (`summary-report.html`).
 *
 * Markup and styling intentionally use legacy email-safe patterns (nested tables,
 * inline `style` attributes, limited selectors) so the report renders correctly
 * when opened in older desktop Outlook, which uses the Word HTML engine and
 * strips or ignores much of `<head>` CSS. Do not modernise layout or CSS without
 * re-testing in that client.
 */
import { getSysInfo } from '@test-data/props'
import process from 'node:process'
import type { ReportRunResult, ReportTemplateContext, ReportTestInfo } from '../types'
import { escapeHtml, formatHtmlLink, formatHtmlTestRow, formatTemplate, getAffectRatio, loadFileForReport } from '../utils'

type SectionTone = 'red' | 'orange' | 'purple' | 'blue'

const STATUS_HTML: Record<ReportRunResult['status'], string> = {
  Passed: '<span class="type-green">●</span> Passed',
  Failed: '<span class="type-red">●</span> Failed',
  'Timed out': '<span class="type-orange">●</span> Timed out',
  Interrupted: '<span class="type-orange">●</span> Interrupted',
  Unknown: 'Undefined',
}

const SECTION_TITLES: Record<SectionTone, string> = {
  red: 'Failed tests',
  orange: 'Flaky tests',
  purple: 'Affected tests',
  blue: 'Skipped tests',
}

export default class ApihubStyledHtmlReport {
  constructor(readonly runResult: ReportRunResult) {}

  async getReport(): Promise<string> {
    const sysInfo = await getSysInfo()
    const htmlTemplate = loadFileForReport('html-apihub-styled/template.html')
    const templateKeys: ReportTemplateContext = {
      status: STATUS_HTML[this.runResult.status],
      startTime: escapeHtml(this.runResult.startTime),
      duration: escapeHtml(this.runResult.duration),
      workers: this.runResult.workers,
      allTests: this.runResult.counts.allTests,
      executedTests: this.runResult.counts.executedTests,
      passedTests: this.runResult.counts.passedTests,
      failedTests: this.runResult.counts.failedTests,
      flakyTests: this.runResult.counts.flakyTests,
      affectedTests: this.runResult.counts.affectedTests,
      skippedTests: this.runResult.counts.skippedTests,
      style: `<style>${loadFileForReport('html-apihub-styled/style.css')}</style>`,
      ratio: this.formatRatio(),
      envName: formatHtmlLink(sysInfo.environment, sysInfo.environment),
      backendVersion: escapeHtml(sysInfo.build.backendVersion),
      frontendVersion: '-',
      pwBranch: escapeHtml(process.env.CI_PW_BRANCH || '-'),
      ciJobLink: process.env.CI_JOB_LINK
        ? formatHtmlLink(process.env.CI_JOB_LINK, `#${process.env.CI_JOB_NUMBER ?? ''} (Detailed report)`)
        : '-',
      ciUser: escapeHtml(process.env.CI_USER || '-'),
      failedTable: this.sectionTable('red', this.runResult.lists.failedList),
      flakyTable: this.sectionTable('orange', this.runResult.lists.flakyList),
      affectedTable: this.sectionTable('purple', this.runResult.lists.affectedList),
      skippedTable: this.sectionTable('blue', this.runResult.lists.skippedList),
    }
    return formatTemplate(htmlTemplate, templateKeys)
  }

  private formatRatio(): string {
    const ratio = getAffectRatio(this.runResult)
    if (ratio <= 20) {
      return `<span class="type-green">●</span> ${ratio}%`
    }
    if (ratio <= 30) {
      return `<span class="type-orange">●</span> ${ratio}%`
    }
    return `<span class="type-red">●</span> ${ratio}%`
  }

  private sectionTable(tone: SectionTone, list: Map<string, ReportTestInfo>): string {
    if (list.size === 0) {
      return ''
    }
    // Inline padding: Outlook does not reliably apply class rules from <head> styles.
    return `<tr>
          <td colspan="2" style="padding: 20px 0px 10px 0px" class="result-type-title">
            <span class="type-${tone}">●</span> ${SECTION_TITLES[tone]}
          </td>
        </tr>
        ${this.renderTestRows(list)}`
  }

  private renderTestRows(list: Map<string, ReportTestInfo>): string {
    let rows = ''
    list.forEach(test => {
      rows += formatHtmlTestRow(test)
    })
    return rows
  }
}
