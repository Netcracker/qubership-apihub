import type { CustomReporterOptions, GitHubReportOptions, ResolvedCustomReporterOptions } from './types'

const DEFAULT_OUTPUT_FOLDER = 'reports/summary'
const DEFAULT_GITHUB_TITLE = 'Playwright tests result'

export function resolveCustomReporterOptions(options: CustomReporterOptions = {}): ResolvedCustomReporterOptions {
  const github = options.github === false || options.github === undefined
    ? false
    : {
      title: options.github.title ?? DEFAULT_GITHUB_TITLE,
      affectRatio: options.github.affectRatio ?? false,
    } satisfies GitHubReportOptions

  return {
    outputFolder: options.outputFolder ?? DEFAULT_OUTPUT_FOLDER,
    html: options.html ?? true,
    github: github,
  }
}
