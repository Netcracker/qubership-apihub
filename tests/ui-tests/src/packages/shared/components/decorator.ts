import { test as report } from '@playwright/test'
import type { BaseComponent } from '@shared/components/base'
import { handlePlaywrightError, quoteName } from '@services/utils'

const HOVER_TOOLTIP_TIMEOUT = 500

/**
 * A decorator factory that adds descriptive logging to methods in UI component classes.
 *
 * This decorator is designed specifically for Playwright test automation. It:
 * 1. Wraps the target method with Playwright's test.step() for improved test reporting
 * 2. Automatically generates a descriptive step title based on the action, component name, and component type
 * 3. Handles errors with descriptive messages that help identify the exact component and action that failed
 * 4. Optionally adds a wait period after actions to allow tooltips to appear (useful for hover actions)
 *
 * The decorator supports two argument patterns:
 * - Methods with no input value: e.g., click(), hover()
 * - Methods with a string value: e.g., type('text'), select('option')
 *
 * @param action - The action being performed, e.g. "Click", "Type", "Hover", etc.
 * @param waitForTooltip - When true, waits for HOVER_TOOLTIP_TIMEOUT milliseconds after the action
 *                        to allow UI elements like tooltips to appear. Defaults to false.
 * @returns A method decorator that can be applied to component class methods.
 */
export function descriptive(action: string, waitForTooltip = false) {
  return function <This extends BaseComponent, Args extends Array<unknown>>(
    target: (this: This, ...args: Args) => Promise<void>,
  ) {
    return async function (this: This, ...args: Args): Promise<void> {
      // Check if first argument is a string (used for type/fill operations)
      const value = typeof args[0] === 'string' ? args[0] : undefined

      // Create descriptive step title
      const componentDetails = `${quoteName(this.componentName)} ${this.componentType}`
      const stepTitle = value
        ? `${action} "${value}" into ${componentDetails}`
        : `${action} ${componentDetails}`

      await report.step(stepTitle, async () => {
        try {
          // Execute the original method
          await target.apply(this, args)

          // Wait for tooltip if needed (e.g. for hover operations)
          if (waitForTooltip) {
            await this.mainLocator.page().waitForTimeout(HOVER_TOOLTIP_TIMEOUT)
          }
        } catch (error: unknown) {
          // Enhance error with context information
          const errorPrefix = `Failed to ${action}`
          const errorContext = value ? ` "${value}" into ${componentDetails}` : ` ${componentDetails}`
          handlePlaywrightError(error, `${errorPrefix}${errorContext}`)
        }
      }, { box: true })
    }
  }
}
