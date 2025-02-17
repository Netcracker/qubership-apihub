import type { Locator } from '@playwright/test'
import type { ClickOptions, HoverOptions, TimeoutOption } from '@shared/entities'
import { descriptiveClick, descriptiveFocus, descriptiveHover, descriptiveScroll } from '@shared/components/decorator'

export class BaseComponent {

  /**
   * Locator for child elements of the component
   */
  readonly rootLocator: Locator
  /**
   * Locator for actions and expects
   */
  readonly mainLocator: Locator
  /**
   * Name for human-readable reports
   */
  readonly componentName?: string
  /**
   * Type for human-readable reports
   */
  readonly componentType: string

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    this.rootLocator = rootLocator
    this.mainLocator = rootLocator
    this.componentName = componentName || ''
    this.componentType = componentType || 'component'
  }

  async click(options?: ClickOptions): Promise<void> {
    await descriptiveClick(this, options)
  }

  async hover(options?: HoverOptions): Promise<void> {
    await descriptiveHover(this, options)
  }

  async scrollIntoViewIfNeeded(options?: TimeoutOption): Promise<void> {
    await descriptiveScroll(this, options)
  }

  async focus(options?: HoverOptions): Promise<void> {
    await descriptiveFocus(this, options)
  }
}
