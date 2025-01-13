/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
