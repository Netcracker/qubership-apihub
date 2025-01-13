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

import type { ComponentParams } from '@shared/components/types'
import { TableCell, TableRow } from '@shared/components/base'
import type { Locator } from '@playwright/test'

export class DeprecatedDescriptionTableRow extends TableRow {

  readonly descriptionCell = new TableCell(this.mainLocator.getByTestId('Cell-description'), 'Description')
  readonly deprecatedSinceCell = new TableCell( this.mainLocator.getByTestId('Cell-deprecated-since'), 'Deprecated Since')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
