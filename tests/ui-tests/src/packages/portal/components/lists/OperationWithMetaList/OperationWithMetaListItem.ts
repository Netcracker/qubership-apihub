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
import { Checkbox, Content, Link, ListItem, Title } from '@shared/components/base'

export class OperationWithMetaListItem extends ListItem {

  readonly checkbox = new Checkbox(this.mainLocator.getByRole('checkbox'), this.componentName, `${this.componentType} checkbox`)
  readonly title = new Title(this.mainLocator.getByTestId('OperationTitle'), this.componentName, `${this.componentType} title`)
  readonly link = new Link(this.mainLocator.getByRole('link'), this.componentName, `${this.componentType} link`)
  readonly meta = new Content(this.mainLocator.getByTestId('OperationPath'), this.componentName, `${this.componentType} meta`)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
