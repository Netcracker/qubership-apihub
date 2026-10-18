import type { Locator } from '@playwright/test'
import type { ClickOptions, HoverOptions, TimeoutOption } from '@shared/entities'
import { descriptive } from '@shared/components/decorator'

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

  @descriptive('Click')
  async click(options?: ClickOptions): Promise<void> {
    await this.mainLocator.click(options)
  }

  @descriptive('Hover', true)
  async hover(options?: HoverOptions): Promise<void> {
    await this.mainLocator.hover(options)
  }

  @descriptive('Scroll to visible')
  async scrollIntoViewIfNeeded(options?: TimeoutOption): Promise<void> {
    await this.mainLocator.scrollIntoViewIfNeeded(options)
  }

  @descriptive('Focus')
  async focus(options?: TimeoutOption): Promise<void> {
    await this.mainLocator.focus(options)
  }
}
