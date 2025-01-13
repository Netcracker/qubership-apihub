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

import { BaseComponent, Indicator } from '@shared/components/base'
import type { ComponentParams } from '@shared/components/types'
import { OperationComparisonSummary } from './OperationComparisonSummary'
import type { Locator } from '@playwright/test'

export class OperationComparisonRow extends BaseComponent {

  readonly componentType: string = 'comparison row'
  readonly changeSeverityIndicator = new Indicator(this.rootLocator.getByTestId('ChangeSeverityIndicator'), `${this.componentName} Changes Severity`)
  readonly leftSummary = new OperationComparisonSummary(this.rootLocator.getByTestId('LeftComparisonSummary'), `Left ${this.componentName}`)
  readonly rightSummary = new OperationComparisonSummary(this.rootLocator.getByTestId('RightComparisonSummary'), `Right ${this.componentName}`)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
