import * as core from '@actions/core'
import type { TestError } from '@playwright/test/reporter'
import type { GitHubReportOptions, ReportRunResult } from '../types'
import { escapeHtml, getAffectRatio } from '../utils'

const STATUS_LABELS: Record<ReportRunResult['status'], string> = {
  Passed: '✅ Passed',
  Failed: '❌ Failed',
  'Timed out': '⏰ Timed out',
  Interrupted: '⚠️ Interrupted',
  Unknown: '❓ Unknown',
}

type SummaryTableRow = Array<{ data: string; header?: boolean; colspan?: string }>

export function buildGitHubSummaryTable(
  runResult: ReportRunResult,
  options: GitHubReportOptions,
): SummaryTableRow[] {
  const { counts } = runResult
  const rows: SummaryTableRow[] = [
    [{ data: 'Summary', header: true, colspan: '2' }],
    [{ data: 'Status' }, { data: STATUS_LABELS[runResult.status] }],
  ]

  if (options.affectRatio) {
    const ratio = getAffectRatio(runResult)
    let ratioLabel = `✅ ${ratio}%`
    if (ratio > 30) {
      ratioLabel = `❌ ${ratio}%`
    } else if (ratio > 20) {
      ratioLabel = `⚠️ ${ratio}%`
    }
    rows.push([{ data: 'Affect Ratio' }, { data: ratioLabel }])
  }

  rows.push([{ data: 'Executed' }, { data: counts.executedTests.toString() }])

  if (counts.skippedTests > 0) {
    rows.push([{ data: 'Skipped' }, { data: counts.skippedTests.toString() }])
  }
  if (counts.flakyTests > 0) {
    rows.push([{ data: 'Flaky' }, { data: counts.flakyTests.toString() }])
  }
  if (counts.failedTests > 0) {
    rows.push([{ data: 'Failed' }, { data: counts.failedTests.toString() }])
  }

  return rows
}

export default class GitHubActionsReport {
  constructor(
    readonly runResult: ReportRunResult,
    private readonly options: GitHubReportOptions,
  ) {}

  async write(): Promise<string> {
    // emptyBuffer clears only this process's in-memory summary buffer (not GITHUB_STEP_SUMMARY on disk).
    // Other job steps' appended file content is preserved; write() still appends our block to the file.
    core.summary
      .emptyBuffer()
      .addHeading(this.options.title, 2)
      .addTable(buildGitHubSummaryTable(this.runResult, this.options))
      .addSeparator()

    if (this.runResult.lists.failedList.size > 0) {
      core.summary.addHeading('Failed Tests', 3)
      this.addFailedTestsDetails()
    }

    const markdown = core.summary.stringify()
    await core.summary.write()
    return markdown
  }

  private formatTestError(error: TestError): string {
    // Stack already includes the message; avoid duplicating it in the code block.
    if (error.stack) {
      return this.cleanAnsiCodes(error.stack)
    }
    if (error.message) {
      return this.cleanAnsiCodes(error.message)
    }
    if (error.value) {
      return this.cleanAnsiCodes(error.value)
    }
    return this.cleanAnsiCodes(String(error))
  }

  private cleanAnsiCodes(text: string): string {
    return text
      // eslint-disable-next-line no-control-regex
      .replace(/\u001b\[[0-9;]*m/g, '')
  }

  private addFailedTestsDetails(): void {
    this.runResult.lists.failedList.forEach((test, fullTitle) => {
      // GitHub renders <details> body flush against the summary line; leading <br> adds spacing.
      let detailsContent = '<br>\n\n'

      if (test.tags && test.tags.length > 0) {
        const tagsFormatted = test.tags.map(tag => `\`${tag}\``).join(' ')
        detailsContent += `**Tags:** ${tagsFormatted}\n\n`
      }

      if (test.annotations && test.annotations.length > 0) {
        test.annotations.forEach(annotation => {
          detailsContent += `**${escapeHtml(annotation.type)}**${
            annotation.description ? `: ${escapeHtml(annotation.description)}` : ''
          }\n\n`
        })
      }

      if (test.firstAttemptErrors && test.firstAttemptErrors.length > 0) {
        detailsContent += '**Errors:**\n\n'
        test.firstAttemptErrors.forEach(error => {
          detailsContent += `\`\`\`\n${this.formatTestError(error)}\n\`\`\`\n\n`
        })
      }

      core.summary.addDetails(escapeHtml(fullTitle), detailsContent)
    })
    core.summary.addSeparator()
  }
}
