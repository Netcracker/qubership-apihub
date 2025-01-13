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
import { BaseComponent, Chip, Content, Link } from '@shared/components/base'

export class GsSearchResultRow extends BaseComponent {

  readonly componentType: string = 'row'
  readonly pathToSearchResultItem = new Content(this.mainLocator.getByTestId('PathToSearchResultItem'), `Path to '${this.componentName}'`)
  readonly versionStatus = new Chip(this.mainLocator.getByTestId('VersionStatusChip'), `'${this.componentName}' package version status`)
  readonly link = new Link(this.mainLocator.getByRole('link'), this.componentName)
  readonly operationType = new Chip(this.mainLocator.getByTestId('OperationTypeChip'), `'${this.componentName}' operation type`)
  readonly operationEndpoint = new Content(this.mainLocator.getByTestId('OperationEndpoint'), `'${this.componentName}' operation endpoint`)
  readonly publicationDate = new Content(this.mainLocator.getByTestId('PublicationDateValue'), `'${this.componentName}' publication date`)
  readonly docContent = new Content(this.mainLocator.getByTestId('DocumentContent'), `'${this.componentName}' document`)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
