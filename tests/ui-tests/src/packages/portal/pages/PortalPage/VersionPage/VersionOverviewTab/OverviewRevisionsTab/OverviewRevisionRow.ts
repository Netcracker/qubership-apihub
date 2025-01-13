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
import { BaseComponent, Icon, Link, TableCell, TableRow } from '@shared/components/base'

export class OverviewRevisionRow extends TableRow {

  readonly componentType = 'revision row'
  readonly revisionCell = new TableCell(this.rootLocator.getByTestId('Cell-version'), `${this.componentName} Revision`)
  readonly statusCell = new TableCell(this.rootLocator.getByTestId('Cell-version-status'), `${this.componentName} Status`)
  readonly labelsCell = new TableCell(this.rootLocator.getByTestId('Cell-labels'), `${this.componentName} Labels`)
  readonly publicationDateCell = new TableCell(this.rootLocator.getByTestId('Cell-publication-date'), `${this.componentName} Publication Date`)
  readonly publishedByCell = new TableCell(this.rootLocator.getByTestId('Cell-published-by'), `${this.componentName} Published By`)
  readonly link = new Link(this.rootLocator.getByRole('link'), `${this.componentName} Revision`)
  readonly infoIcon = new Icon(this.rootLocator.getByTestId('InfoButton'), `${this.componentName} Info`)
  readonly infoTooltip = new BaseComponent(this.rootLocator.page().getByRole('tooltip'), `${this.componentName} Info`, 'tooltip')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
