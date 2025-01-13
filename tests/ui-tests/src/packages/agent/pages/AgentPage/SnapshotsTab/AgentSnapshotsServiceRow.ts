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
import { Link, TableCell, TableRow } from '@shared/components/base'
import { ChangesTableCell } from '@shared/components/custom'
import { hoverableOpening } from '@shared/helpers'

export class AgentSnapshotsServiceRow extends TableRow {

  readonly serviceCell = new TableCell(this.mainLocator.getByTestId('Cell-snapshot-or-service'), this.componentName, 'service name cell')
  readonly bwcStatusCell = new TableCell(this.mainLocator.getByTestId('Cell-baseline-or-bwc-status'), this.componentName, 'bwc status cell')
  readonly changesCell = new ChangesTableCell(this.mainLocator.getByTestId('Cell-changes'), this.componentName)
  readonly viewChangesLnk = new Link(this.mainLocator.getByTestId('Cell-view-changes-url').getByRole('link'), this.componentName, 'view changes link')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'service row')
  }

  async viewChanges(): Promise<void> {
    await hoverableOpening(this, this.viewChangesLnk, 'View Changes')
  }
}
