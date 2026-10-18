import { BaseExpect } from './BaseExpect'

export class ExpectText extends BaseExpect<string> {

  constructor(
    actual: string,
    isNot = false,
    isSoft = false,
    message?: string,
  ) {
    super(actual, isNot, isSoft, message)
  }

  get not(): ExpectText {
    return new ExpectText(this.actual, !this.isNot, this.isSoft, this.message)
  }

  protected override formatStepMessage(assertionDescription: string): string {
    return `Expect text ${this.notIndicator}${assertionDescription}`
  }

  async toContain(expected: string): Promise<void> {
    await this.executeExpectation(
      `to contain "${expected}"`,
      'toContain',
      [expected],
    )
  }

  async toMatch(expected: RegExp): Promise<void> {
    await this.executeExpectation(
      `to match "${expected}"`,
      'toMatch',
      [expected],
    )
  }
}
