import { BaseExpect } from './BaseExpect'
import type { DownloadedTestFile } from '@shared/entities/files'

export class ExpectFile extends BaseExpect<DownloadedTestFile> {

  constructor(
    actual: DownloadedTestFile,
    isNot = false,
    isSoft = false,
    message?: string,
  ) {
    super(actual, isNot, isSoft, message)
  }

  get not(): ExpectFile {
    return new ExpectFile(this.actual, !this.isNot, this.isSoft, this.message)
  }

  protected override formatStepMessage(assertionDescription: string): string {
    return `Expect file ${this.notIndicator}${assertionDescription}`
  }

  async toHaveName(expected: string): Promise<void> {
    await this.executeExpectation(
      `to have name "${expected}"`,
      'toEqual',
      [expected],
      this.actual.fileId,
    )
  }

  async toContainText(expected: string): Promise<void> {
    await this.executeExpectation(
      `to contain text "${expected}"`,
      'toContain',
      [expected],
      this.actual.data,
    )
  }
}
