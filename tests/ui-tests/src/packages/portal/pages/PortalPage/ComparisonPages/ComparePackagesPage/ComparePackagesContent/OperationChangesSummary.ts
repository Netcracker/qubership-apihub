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
import { BaseComponent, Content } from '@shared/components/base'

export class OperationChangesSummary extends BaseComponent {

  readonly componentType: string = 'changes summary'
  readonly breaking = new Content(this.mainLocator.getByTestId('breaking'), `${this.componentName} Breaking changes`)
  readonly semiBreaking = new Content(this.mainLocator.getByTestId('semi-breaking'), `${this.componentName} Semi-breaking changes`)
  readonly deprecated = new Content(this.mainLocator.getByTestId('deprecated'), `${this.componentName} Deprecated changes`)
  readonly nonBreaking = new Content(this.mainLocator.getByTestId('non-breaking'), `${this.componentName} Non-breaking changes`)
  readonly annotation = new Content(this.mainLocator.getByTestId('annotation'), `${this.componentName} Annotation changes`)
  readonly unclassified = new Content(this.mainLocator.getByTestId('unclassified'), `${this.componentName} Unclassified changes`)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
