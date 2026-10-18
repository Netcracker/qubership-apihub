import type { FullConfig, FullResult, Reporter, Suite } from '@playwright/test/reporter'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildRunResult } from './build-run-result'
import ApihubStyledHtmlReport from './reports/ApihubStyledHtmlReport'
import GitHubActionsReport from './reports/GitHubActionsReport'
import { resolveCustomReporterOptions } from './resolve-options'
import { isUnitTestSuite } from './suite-utils'
import type { CustomReporterOptions, ReportRunResult, ResolvedCustomReporterOptions } from './types'

class CustomReporter implements Reporter {
  private suite!: Suite
  private workers = 0
  private readonly resolvedOptions = resolveCustomReporterOptions(this.options)

  constructor(readonly options: CustomReporterOptions = {}) {}

  onBegin(config: FullConfig, suite: Suite): void {
    this.suite = suite
    this.workers = config.workers
  }

  async onEnd(result: FullResult): Promise<void> {
    const runResult = buildRunResult(this.suite, result, this.workers)
    await emitReports(runResult, this.getEffectiveOptions())
  }

  printsToStdio(): boolean {
    return false
  }

  private getEffectiveOptions(): ResolvedCustomReporterOptions {
    // ApihubStyledHtmlReport fetches backend metadata; skip HTML for unit-only suites.
    if (!this.resolvedOptions.html || !isUnitTestSuite(this.suite)) {
      return this.resolvedOptions
    }
    return { ...this.resolvedOptions, html: false }
  }
}

async function emitReports(
  runResult: ReportRunResult,
  options: ResolvedCustomReporterOptions,
): Promise<void> {
  mkdirSync(options.outputFolder, { recursive: true })
  // Status is the CI gate artifact - write it before optional sinks so a sink failure cannot skip it.
  writeFileSync(join(options.outputFolder, 'status'), runResult.status)

  const failures: Error[] = []

  if (options.html) {
    try {
      const html = await new ApihubStyledHtmlReport(runResult).getReport()
      writeFileSync(join(options.outputFolder, 'summary-report.html'), html)
    } catch (error) {
      failures.push(toError(error, 'HTML report'))
    }
  }

  if (options.github) {
    try {
      await new GitHubActionsReport(runResult, options.github).write()
    } catch (error) {
      failures.push(toError(error, 'GitHub Actions report'))
    }
  }

  if (failures.length === 1) {
    throw failures[0]
  }
  if (failures.length > 1) {
    throw new AggregateError(failures, 'Custom reporter failed to emit one or more outputs')
  }
}

function toError(error: unknown, sink: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  return new Error(`${sink}: ${message}`, { cause: error })
}

export default CustomReporter
