import type { Locator } from '@playwright/test'
import { BaseComponent } from '@shared/components/base'
import { BaseExpect } from './BaseExpect'
import type {
  BeCheckedOptions,
  BeEnabledOptions,
  BeVisibleOptions,
  HaveAttributeOptions,
  HaveContainTextOptions,
  TimeoutOption,
} from './options'

export type ExpectInput = Locator | BaseComponent

export class CommonExpect<T extends ExpectInput> extends BaseExpect<T> {
  constructor(
    actual: T,
    isNot = false,
    isSoft = false,
    message?: string,
  ) {
    super(actual, isNot, isSoft, message)
  }

  get not(): CommonExpect<T> {
    return new CommonExpect(this.actual, !this.isNot, this.isSoft, this.message)
  }

  async toBeVisible(options?: BeVisibleOptions): Promise<void> {
    await this.executeExpectation('to be visible', 'toBeVisible', [options])
  }

  async toBeHidden(options?: TimeoutOption): Promise<void> {
    await this.executeExpectation('to be hidden', 'toBeHidden', [options])
  }

  async toBeEnabled(options?: BeEnabledOptions): Promise<void> {
    await this.executeExpectation('to be enabled', 'toBeEnabled', [options])
  }

  async toBeDisabled(options?: TimeoutOption): Promise<void> {
    await this.executeExpectation('to be disabled', 'toBeDisabled', [options])
  }

  async toBeEmpty(options?: TimeoutOption): Promise<void> {
    await this.executeExpectation('to be empty', 'toBeEmpty', [options])
  }

  async toHaveText(
    expected: string | RegExp | Array<string | RegExp>,
    options?: HaveContainTextOptions,
  ): Promise<void> {
    await this.executeExpectation(`to have text "${expected}"`, 'toHaveText', [expected, options])
  }

  async toContainText(
    expected: string | RegExp | Array<string | RegExp>,
    options?: HaveContainTextOptions,
  ): Promise<void> {
    await this.executeExpectation(`to contain text "${expected}"`, 'toContainText', [expected, options])
  }

  async toHaveValue(expected: string | RegExp, options?: TimeoutOption): Promise<void> {
    await this.executeExpectation(`to have value "${expected}"`, 'toHaveValue', [expected, options])
  }

  async toHaveCount(expected: number, options?: TimeoutOption): Promise<void> {
    await this.executeExpectation(`to have count "${expected}"`, 'toHaveCount', [expected, options])
  }

  async toBePressed(options?: TimeoutOption): Promise<void> {
    await this.executeExpectation('to be pressed', 'toHaveAttribute', ['aria-pressed', 'true', options])
  }

  async toBeFocused(options?: TimeoutOption): Promise<void> {
    await this.executeExpectation('to be focused', 'toBeFocused', [options])
  }

  async toBeChecked(options?: BeCheckedOptions): Promise<void> {
    await this.executeExpectation('to be checked', 'toBeChecked', [options])
  }

  async toHaveClass(expected: string | RegExp | Array<string | RegExp>, options?: TimeoutOption): Promise<void> {
    await this.executeExpectation(`to have class "${expected}"`, 'toHaveClass', [expected, options])
  }

  async toHaveAttribute(name: string, value: string | RegExp, options?: HaveAttributeOptions): Promise<void> {
    await this.executeExpectation(`to have attribute "${name}" with value "${value}"`, 'toHaveAttribute', [
      name,
      value,
      options,
    ])
  }

  /**
   * Verifies that an element contains an icon with the specified test ID.
   * Searches for the first SVG element within the component and checks its data-testid attribute.
   * @param expected - The data-testid of the icon to verify (e.g., 'ErrorIcon', 'WarningIcon')
   * @param options - Optional timeout options
   */
  async toHaveIcon(expected: string, options?: TimeoutOption): Promise<void> {
    const customLocator = this.actual instanceof BaseComponent
      ? this.actual.mainLocator.locator('svg').first()
      : this.actual.locator('svg').first()
    await this.executeExpectation(
      `to have icon "${expected}"`,
      'toHaveAttribute',
      ['data-testid', expected, options],
      customLocator,
    )
  }

  /**
   * Verifies that an element contains an icon with the specified CSS class.
   * Checks if the element itself has the specified class (used for Monaco codicon icons).
   * Uses regex pattern matching to check if the class is present among other classes.
   * @param expected - The CSS class to verify (e.g., 'codicon-error', 'codicon-warning')
   * @param options - Optional timeout options
   */
  async toHaveIconClass(expected: string, options?: TimeoutOption): Promise<void> {
    const regex = new RegExp(expected)
    await this.executeExpectation(
      `to have icon class "${expected}"`,
      'toHaveClass',
      [regex, options],
    )
  }

  async toBeInViewport(options?: TimeoutOption): Promise<void> {
    await this.executeExpectation('to be in viewport', 'toBeInViewport', [options])
  }
}
