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

import { TableCell } from '@shared/components/base'
import { ChangesTableCell } from '@shared/components/custom'
import { ExpandableOperationsPackageTableRow } from '../../ExpandableOperationsPackageTableRow'
import type { Locator } from '@playwright/test'

export class ApiChangesPackageTableRow extends ExpandableOperationsPackageTableRow {

  readonly endpointCell = new TableCell(this.mainLocator.getByTestId('Cell-endpoint-column'), 'Endpoint')
  readonly tagsCell = new TableCell(this.mainLocator.getByTestId('Cell-tags-column'), 'Tags')
  readonly changesCell = new ChangesTableCell(this.mainLocator.getByTestId('Cell-changes-column'))
  readonly kindCell = new TableCell(this.mainLocator.getByTestId('Cell-api-kind-column'), 'Kind')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'operation row')
  }
}
