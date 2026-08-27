import type { TestCase } from '@playwright/test/reporter'
import { TICKET_BASE_URL } from '@test-setup'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ReportRunResult, ReportTemplateContext, ReportTestInfo } from './types'

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;',
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, char => HTML_ESCAPE_MAP[char])
}

export function safeHttpUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined
    }
    return parsed.href
  } catch {
    return undefined
  }
}

export function formatHtmlLink(url: string | undefined, label: string): string {
  const escapedLabel = escapeHtml(label)
  const safeUrl = url ? safeHttpUrl(url) : undefined
  if (safeUrl) {
    return `<a class="link" href="${escapeHtml(safeUrl)}">${escapedLabel}</a>`
  }
  return escapedLabel
}

export function formatHtmlTestRow(test: ReportTestInfo): string {
  const testTitle = formatHtmlLink(test.testCaseUrl, test.fullTitle)
  const issues = [...test.issues].map(issue => formatHtmlLink(issue.url, issue.key)).join(', ')
  return `<tr><td class="test-cell">${testTitle}</td><td class="bugs-cell">${issues}</td></tr>`
}

const reportAssetsDir = join(dirname(fileURLToPath(import.meta.url)), 'reports')

export function getAffectRatio(runResult: ReportRunResult): number {
  const { failedTests, affectedTests, skippedTests, allTests } = runResult.counts
  return allTests === 0 ? 0 : Math.round((failedTests + affectedTests + skippedTests) * 100 / allTests)
}

export function formatDate(date: Date): string {
  return date.toLocaleString('en-EN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZone: 'Europe/Moscow',
    timeZoneName: 'short',
    hour12: false,
  })
}

/**
 * Replaces `{{key}}` placeholders with `String(value)`.
 * Does not escape HTML; callers must escape user-controlled values first.
 */
export function formatTemplate(template: string, context: ReportTemplateContext): string {
  return Object.entries(context).reduce((page, [key, value]) => {
    return page.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
  }, template)
}

export function loadFileForReport(file: string): string {
  return readFileSync(join(reportAssetsDir, file), 'utf8')
}

/**
 * Playwright titlePath layout:
 *   [0] '' (root)
 *   [1] project name
 *   [2] file suite
 *   [3..n-2] nested describes (outermost first)
 *   [n-1] test title
 */
export function formatFullTitle(titlePath: string[]): string {
  const project = titlePath[1]
  const testTitle = titlePath[titlePath.length - 1]
  const outermostDescribe = titlePath[3]

  // No describe between file and test: ['', project, file, testTitle]
  if (titlePath.length < 5) {
    return `${project} > ${testTitle}`
  }

  return `${project} > ${outermostDescribe} > ${testTitle}`
}

export function getTestInfo(test: TestCase): ReportTestInfo {
  const titlePath = test.titlePath()
  const [, project] = titlePath
  const testInfo: ReportTestInfo = {
    project: project,
    fullTitle: formatFullTitle(titlePath),
    issues: new Set(),
    tags: test.tags.length > 0 ? [...test.tags] : [],
    annotations: test.annotations.length > 0 ? [...test.annotations] : [],
  }

  for (const annotation of test.annotations) {
    if (annotation.type === 'Test Case' || annotation.type === 'URL') {
      testInfo.testCaseUrl = annotation.description
    }
    if (annotation.type === 'Issue' && annotation.description) {
      const url = annotation.description.startsWith('https') ? annotation.description : undefined
      const key = annotation.description.replace(TICKET_BASE_URL, '')
      testInfo.issues.add({ key, url })
    }
  }

  return testInfo
}
