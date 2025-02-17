import { expect as expectPw, test } from '@fixtures'
import type { DownloadedTestFile } from '@shared/entities/files'

class BaseExpectFile {
  protected readonly notStr: string

  constructor(
    protected readonly actual: DownloadedTestFile,
    protected readonly isNot: boolean,
    protected readonly isSoft: boolean,
    protected readonly message?: string,
  ) {
    if (isNot) {
      this.notStr = 'not '
    } else {
      this.notStr = ''
    }
  }

  async toHaveName(expected: string): Promise<void> {
    await test.step(`Expect file ${this.notStr}to have name "${expected}"`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          expectPw(this.actual.fileId, this.message || undefined).toEqual(expected)
        } else {
          expectPw.soft(this.actual.fileId, this.message || undefined).toEqual(expected)
        }
      } else {
        if (!this.isSoft) {
          expectPw(this.actual.fileId, this.message || undefined).not.toEqual(expected)
        } else {
          expectPw.soft(this.actual.fileId, this.message || undefined).not.toEqual(expected)
        }
      }
    }, { box: true })
  }

  async toContainText(expected: string): Promise<void> {
    await test.step(`Expect file ${this.notStr}to contain text "${expected}"`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          expectPw(this.actual.data, this.message || undefined).toContain(expected)
        } else {
          expectPw.soft(this.actual.data, this.message || undefined).toContain(expected)
        }
      } else {
        if (!this.isSoft) {
          expectPw(this.actual.data, this.message || undefined).not.toContain(expected)
        } else {
          expectPw.soft(this.actual.data, this.message || undefined).not.toContain(expected)
        }
      }
    }, { box: true })
  }
}

export class ExpectFile extends BaseExpectFile {
  readonly not = new BaseExpectFile(this.actual, true, this.isSoft, this.message)

  constructor(
    protected readonly actual: DownloadedTestFile,
    protected readonly isNot: boolean,
    protected readonly isSoft: boolean,
    protected readonly message?: string,
  ) {
    super(actual, isNot, isSoft, message)
  }
}
