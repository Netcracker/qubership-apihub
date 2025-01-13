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
import { Button, TableCell, TableRow } from '@shared/components/base'

export class AgentSnapshotsSnapshotRow extends TableRow {

  readonly expandBtn = new Button(this.mainLocator.getByTestId('KeyboardArrowRightOutlinedIcon'), this.componentName, 'expand button')
  readonly collapseBtn = new Button(this.mainLocator.getByTestId('KeyboardArrowDownOutlinedIcon'), this.componentName, 'collapse button')
  readonly snapshotCell = new TableCell(this.mainLocator.getByTestId('Cell-snapshot-or-service'), this.componentName, 'snapshot name cell')
  readonly publishDateCell = new TableCell(this.mainLocator.getByTestId('Cell-published-date'), this.componentName, 'publish date cell')
  readonly baselinePackageCell = new TableCell(this.mainLocator.getByTestId('Cell-baseline-or-bwc-status'), this.componentName, 'baseline package cell')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'service row')
  }
}
