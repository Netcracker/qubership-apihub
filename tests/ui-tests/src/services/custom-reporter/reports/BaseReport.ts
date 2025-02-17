import type { ReportRunResult } from '../types'

export default abstract class BaseReport {

  abstract runResult: ReportRunResult

  abstract getReport(): Promise<string>

}
