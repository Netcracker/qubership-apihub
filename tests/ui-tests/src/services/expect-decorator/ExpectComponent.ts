import { test } from '@fixtures'
import { expect as expectPw } from '@playwright/test'
import type {
  BeCheckedOptions,
  BeEnabledOptions,
  BeVisibleOptions,
  HaveAttributeOptions,
  HaveContainTextOptions,
  TimeoutOption,
} from '@services/expect-decorator/options'
import type { BaseComponent } from '@shared/components/base'
import { quoteName } from '@services/utils'

class BaseExpectComponent {
  protected readonly notStr: string

  constructor(
    protected readonly actual: BaseComponent,
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

  async toBeVisible(options?: BeVisibleOptions): Promise<void> {
    await test.step(`Expect ${quoteName(this.actual.componentName)} ${this.actual.componentType} ${this.notStr}to be visible`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).toBeVisible(options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).toBeVisible(options)
        }
      } else {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).not.toBeVisible(options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).not.toBeVisible(options)
        }
      }
    }, { box: true })
  }

  async toBeHidden(options?: TimeoutOption): Promise<void> {
    await test.step(`Expect ${quoteName(this.actual.componentName)} ${this.actual.componentType} ${this.notStr}to be hidden`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).toBeHidden(options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).toBeHidden(options)
        }
      } else {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).not.toBeHidden(options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).not.toBeHidden(options)
        }
      }
    }, { box: true })
  }

  async toBeEnabled(options?: BeEnabledOptions): Promise<void> {
    await test.step(`Expect ${quoteName(this.actual.componentName)} ${this.actual.componentType} ${this.notStr}to be enabled`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).toBeEnabled(options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).toBeEnabled(options)
        }
      } else {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).not.toBeEnabled(options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).not.toBeEnabled(options)
        }
      }
    }, { box: true })
  }

  async toBeDisabled(options?: TimeoutOption): Promise<void> {
    await test.step(`Expect ${quoteName(this.actual.componentName)} ${this.actual.componentType} ${this.notStr}to be disabled`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).toBeDisabled(options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).toBeDisabled(options)
        }
      } else {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).not.toBeDisabled(options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).not.toBeDisabled(options)
        }
      }
    }, { box: true })
  }

  async toBeEmpty(options?: TimeoutOption): Promise<void> {
    await test.step(`Expect ${quoteName(this.actual.componentName)} ${this.actual.componentType} ${this.notStr}to be empty`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).toBeEmpty(options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).toBeEmpty(options)
        }
      } else {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).not.toBeEmpty(options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).not.toBeEmpty(options)
        }
      }
    }, { box: true })
  }

  async toHaveText(expected: string | RegExp | Array<string | RegExp>, options?: HaveContainTextOptions): Promise<void> {
    await test.step(`Expect ${quoteName(this.actual.componentName)} ${this.actual.componentType} ${this.notStr}to have text "${expected}"`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).toHaveText(expected, options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).toHaveText(expected, options)
        }
      } else {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).not.toHaveText(expected, options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).not.toHaveText(expected, options)
        }
      }
    }, { box: true })
  }

  async toContainText(expected: string | RegExp | Array<string | RegExp>, options?: HaveContainTextOptions): Promise<void> {
    await test.step(`Expect ${quoteName(this.actual.componentName)} ${this.actual.componentType} ${this.notStr}to contain text "${expected}"`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).toContainText(expected, options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).toContainText(expected, options)
        }
      } else {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).not.toContainText(expected, options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).not.toContainText(expected, options)
        }
      }
    }, { box: true })
  }

  async toHaveValue(expected: string | RegExp, options?: TimeoutOption): Promise<void> {
    await test.step(`Expect ${quoteName(this.actual.componentName)} ${this.actual.componentType} ${this.notStr}to have value "${expected}"`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).toHaveValue(expected, options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).toHaveValue(expected, options)
        }
      } else {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).not.toHaveValue(expected, options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).not.toHaveValue(expected, options)
        }
      }
    }, { box: true })
  }

  async toHaveCount(expected: number, options?: TimeoutOption): Promise<void> {
    await test.step(`Expect count of ${this.actual.componentType}s ${this.notStr}to be "${expected}"`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).toHaveCount(expected, options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).toHaveCount(expected, options)
        }
      } else {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).not.toHaveCount(expected, options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).not.toHaveCount(expected, options)
        }
      }
    }, { box: true })
  }

  async toHaveIcon(expected: string, options?: TimeoutOption): Promise<void> {
    await test.step(`Expect ${quoteName(this.actual.componentName)} ${this.actual.componentType} ${this.notStr}to have icon "${expected}"`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator.locator('svg').first(), this.message || undefined).toHaveAttribute('data-testid', expected, options)
        } else {
          await expectPw.soft(this.actual.mainLocator.locator('svg').first(), this.message || undefined).toHaveAttribute('data-testid', expected, options)
        }
      } else {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator.locator('svg').first(), this.message || undefined).not.toHaveAttribute('data-testid', expected, options)
        } else {
          await expectPw.soft(this.actual.mainLocator.locator('svg').first(), this.message || undefined).not.toHaveAttribute('data-testid', expected, options)
        }
      }
    }, { box: true })
  }

  async toBePressed(options?: TimeoutOption): Promise<void> {
    await test.step(`Expect ${quoteName(this.actual.componentName)} ${this.actual.componentType} ${this.notStr}to be pressed`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).toHaveAttribute('aria-pressed', 'true', options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).toHaveAttribute('aria-pressed', 'true', options)
        }
      } else {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).not.toHaveAttribute('aria-pressed', 'true', options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).not.toHaveAttribute('aria-pressed', 'true', options)
        }
      }
    }, { box: true })
  }

  async toBeFocused(options?: TimeoutOption): Promise<void> {
    await test.step(`Expect ${quoteName(this.actual.componentName)} ${this.actual.componentType} ${this.notStr}to be focused`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).toBeFocused(options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).toBeFocused(options)
        }
      } else {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).not.toBeFocused(options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).not.toBeFocused(options)
        }
      }
    }, { box: true })
  }

  async toBeChecked(options?: BeCheckedOptions): Promise<void> {
    await test.step(`Expect ${quoteName(this.actual.componentName)} ${this.actual.componentType} ${this.notStr}to be checked`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).toBeChecked(options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).toBeChecked(options)
        }
      } else {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).not.toBeChecked(options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).not.toBeChecked(options)
        }
      }
    }, { box: true })
  }

  async toHaveClass(expected: string | RegExp | Array<string | RegExp>, options?: TimeoutOption): Promise<void> {
    await test.step(`Expect ${quoteName(this.actual.componentName)} ${this.actual.componentType} ${this.notStr}to have class "${expected}"`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).toHaveClass(expected, options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).toHaveClass(expected, options)
        }
      } else {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).not.toHaveClass(expected, options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).not.toHaveClass(expected, options)
        }
      }
    }, { box: true })
  }

  async toHaveAttribute(name: string, value: string | RegExp, options?: HaveAttributeOptions): Promise<void> {
    await test.step(`Expect ${quoteName(this.actual.componentName)} ${this.actual.componentType} ${this.notStr}to have attribute "${name}" with value "${value}"`, async () => {
      if (!this.isNot) {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).toHaveAttribute(name, value, options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).toHaveAttribute(name, value, options)
        }
      } else {
        if (!this.isSoft) {
          await expectPw(this.actual.mainLocator, this.message || undefined).not.toHaveAttribute(name, value, options)
        } else {
          await expectPw.soft(this.actual.mainLocator, this.message || undefined).not.toHaveAttribute(name, value, options)
        }
      }
    }, { box: true })
  }
}

export class ExpectComponent extends BaseExpectComponent {
  readonly not = new BaseExpectComponent(this.actual, true, this.isSoft, this.message)

  constructor(
    protected readonly actual: BaseComponent,
    protected readonly isNot: boolean,
    protected readonly isSoft: boolean,
    protected readonly message?: string,
  ) {
    super(actual, isNot, isSoft, message)
  }
}
