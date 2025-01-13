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
import { OperationWithMetaList } from '@portal/components'
import { Checkbox, Placeholder, Title } from '@shared/components/base'

export class OperationGroupDialogList extends OperationWithMetaList {

  readonly title = new Title(this.rootLocator.getByRole('heading'), `${this.name} Operation List`)
  readonly allOperationsChx = new Checkbox(this.rootLocator.getByTestId('AllOperationsCheckbox').getByRole('checkbox'), 'All Operations')
  readonly noOperationsPh = new Placeholder( this.rootLocator.getByTestId('NoOperationsPlaceholder'), 'No Operations', `${this.name.toLowerCase()} placeholder`)

  constructor(
    protected readonly rootLocator: Locator,
    protected readonly name: string,
  ) {
    super(rootLocator, name)
  }
}
