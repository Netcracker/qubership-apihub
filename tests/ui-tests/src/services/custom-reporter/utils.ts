import type { TestCase } from '@playwright/test/reporter'
import type { ReportRunResult, ReportTemplateContext, ReportTestInfo } from './types'
import { readFileSync } from 'fs'
import { TICKET_BASE_URL } from '@test-setup'

export function getAffectRatio(runResult: ReportRunResult): number {
  const { failedTests, affectedTests, skippedTests, allTests } = runResult.counts
  return runResult.counts.allTests === 0 ? 0 : Math.round((failedTests + affectedTests + skippedTests) * 100 / allTests)
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

export function millisecondsToMinuteSeconds(milliseconds: number): string {
  const min = Math.floor(milliseconds / 60000)
  const sec = Math.ceil((milliseconds % 60000) / 1000)
  const minString = pad(min)
  const secString = pad(sec)

  if (milliseconds > 0) {
    if (milliseconds < 1000) {
      return '00:01 (mm:ss)'
    }
    if (sec < 10) {
      return `${minString}:${secString} (mm:ss)`
    }
    return `${minString}:${secString} (mm:ss)`
  }
  return '00:00 (mm:ss)'
}

function pad(value: number): string {
  if (value < 10) {
    return `0${value}`
  }
  return value.toString()
}

export function formatTemplate(template: string, { ...context }: ReportTemplateContext): string {
  let page = template
  for (const [key, value] of Object.entries(context)) {
    const pattern = new RegExp(`{{${key}}}`, 'g')
    page = page.replace(pattern, value.toString())
  }

  return page
}

export function loadFileForReport(file: string): string {
  const path = `./src/services/custom-reporter/reports/${file}`
  const fileContent = readFileSync(path, { encoding: 'utf8' })
  return fileContent.toString()
}

export function getTestInfo(test: TestCase): ReportTestInfo {
  const testInfo: ReportTestInfo = { project: '', fullTitle: '', issues: new Set() }
  const [, project] = test.titlePath()
  testInfo.project = project
  testInfo.fullTitle = `${project} > ${test.parent.title} > ${test.title}`

  if (test.annotations.length > 0) {
    for (const annotation of test.annotations) {
      if (annotation.type === 'Test Case' || annotation.type === 'URL') {
        testInfo.testCaseUrl = annotation.description
      }
      if (annotation.type === 'Issue') {
        const url = annotation.description!.startsWith('https') ? annotation.description : undefined
        const key = annotation.description!.replace(TICKET_BASE_URL, '')
        testInfo.issues.add({ key: key, url: url })
      }
    }
  }

  return testInfo
}
