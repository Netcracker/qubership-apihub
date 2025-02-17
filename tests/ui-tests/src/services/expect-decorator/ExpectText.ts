import { expect as expectPw, test } from '@fixtures'

class BaseExpectText {
  protected readonly notStr: string

  constructor(
    protected readonly actual: string,
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

  async toContain(expected: string): Promise<void> {
    await test.step(`Expect text ${this.notStr}to contain "${expected}"`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          expectPw(this.actual, this.message || undefined).toContain(expected)
        } else {
          expectPw.soft(this.actual, this.message || undefined).toContain(expected)
        }
      } else {
        if (!this.isSoft) {
          expectPw(this.actual, this.message || undefined).not.toContain(expected)
        } else {
          expectPw.soft(this.actual, this.message || undefined).not.toContain(expected)
        }
      }
    }, { box: true })
  }

  async toMatch(expected: RegExp): Promise<void> {
    await test.step(`Expect text ${this.notStr}to match "${expected}"`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          expectPw(this.actual, this.message || undefined).toMatch(expected)
        } else {
          expectPw.soft(this.actual, this.message || undefined).toMatch(expected)
        }
      } else {
        if (!this.isSoft) {
          expectPw(this.actual, this.message || undefined).not.toMatch(expected)
        } else {
          expectPw.soft(this.actual, this.message || undefined).not.toMatch(expected)
        }
      }
    }, { box: true })
  }
}

export class ExpectText extends BaseExpectText {
  readonly not = new BaseExpectText(this.actual, true, this.isSoft, this.message)

  constructor(
    protected readonly actual: string,
    protected readonly isNot: boolean,
    protected readonly isSoft: boolean,
    protected readonly message?: string,
  ) {
    super(actual, isNot, isSoft, message)
  }
}
