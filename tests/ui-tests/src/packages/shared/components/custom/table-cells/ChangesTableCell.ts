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
import { Content, TableCell } from '@shared/components/base'

export class ChangesTableCell extends TableCell {

  readonly breakingChanges = new Content(this.mainLocator.getByTestId('breaking'), 'Breaking changes')
  readonly deprecatedChanges = new Content(this.mainLocator.getByTestId('deprecated'), 'Deprecated changes')
  readonly nonBreakingChanges = new Content(this.mainLocator.getByTestId('non-breaking'), 'Non-breaking changes')
  readonly semiBreakingChanges = new Content(this.mainLocator.getByTestId('semi-breaking'), 'Semi-breaking changes')
  readonly annotationChanges = new Content(this.mainLocator.getByTestId('annotation'), 'Annotation changes')
  readonly unclassifiedChanges = new Content(this.mainLocator.getByTestId('unclassified'), 'Unclassified changes')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'changes cell')
  }
}
