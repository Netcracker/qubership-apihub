import { test } from '@fixtures'
import { expect as expectPw } from '@playwright/test'
import { BaseComponent } from '@shared/components/base'
import { handlePlaywrightError, quoteName } from '@services/utils'

/**
 * List of Playwright expect methods that can be called by the BaseExpect class
 */
type CallableExpectMethods =
  'toBeVisible'
  | 'toBeHidden'
  | 'toBeEnabled'
  | 'toBeDisabled'
  | 'toBeEmpty'
  | 'toHaveText'
  | 'toContainText'
  | 'toHaveValue'
  | 'toHaveCount'
  | 'toBeFocused'
  | 'toBeChecked'
  | 'toHaveClass'
  | 'toHaveAttribute'
  | 'toEqual'
  | 'toContain'
  | 'toMatch'

/**
 * Type for accessing Playwright's expect methods
 */
type PlaywrightExpectation = {
  [key in CallableExpectMethods]: (...args: unknown[]) => Promise<void>;
}

/**
 * Base abstract class for all expect decorators
 *
 * This class provides the foundation for all specialized expect classes,
 * handling common functionality like negation, soft assertions, and
 * execution of expectations with proper error handling and reporting.
 *
 * @template T The type of value being asserted on
 */
export abstract class BaseExpect<T> {
  /** Text indicator for negated assertions in step messages */
  protected readonly notIndicator: string = this.isNot ? 'not ' : ''

  /**
   * Creates a new instance of BaseExpect
   *
   * @param actual The value to assert on
   * @param isNot Whether this is a negated assertion
   * @param isSoft Whether this is a soft assertion that doesn't stop test execution on failure
   * @param message Optional custom error message
   */
  protected constructor(
    protected readonly actual: T,
    protected readonly isNot: boolean,
    protected readonly isSoft: boolean,
    protected readonly message?: string,
  ) {}

  /**
   * Returns a new instance of the expect class with negation toggled
   */
  abstract get not(): BaseExpect<T>

  /**
   * Executes an expectation with proper error handling and reporting
   *
   * @param assertionDescription Human-readable description of the assertion
   * @param method The Playwright expect method to call
   * @param params Parameters to pass to the Playwright expect method
   * @param customActual Optional custom value to assert on instead of this.actual
   */
  protected async executeExpectation(
    assertionDescription: string,
    method: CallableExpectMethods,
    params: unknown[] = [],
    customActual?: unknown,
  ): Promise<void> {
    try {
      await test.step(this.formatStepMessage(assertionDescription), async () => {
        const expectFn = this.isSoft ? expectPw.soft : expectPw
        const target = customActual || (this.actual instanceof BaseComponent ? this.actual.mainLocator : this.actual)
        const assertion = expectFn(target, this.message)
        if (this.isNot) {
          await ((assertion.not as unknown) as PlaywrightExpectation)[method](...params)
        } else {
          await ((assertion as unknown) as PlaywrightExpectation)[method](...params)
        }
      }, { box: true })
    } catch (error: unknown) {
      // it only works when not using .soft
      handlePlaywrightError(error, `Expectation failed: ${this.formatStepMessage(assertionDescription)}`)
    }
  }

  /**
   * Formats a human-readable step message for the assertion
   *
   * @param assertionDescription Human-readable description of the assertion
   * @returns Formatted step message
   */
  protected formatStepMessage(assertionDescription: string): string {
    if (this.actual instanceof BaseComponent) {
      return `Expect ${quoteName(this.actual.componentName)} ${this.actual.componentType} ${this.notIndicator}${assertionDescription}`
    }
    return `Expect "${this.actual}" ${this.notIndicator}${assertionDescription}`
  }
}
