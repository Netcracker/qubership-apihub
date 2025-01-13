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

import type { Page } from '@playwright/test'
import { BaseComponent, Button } from '@shared/components/base'
import { OperationWithMetaList } from '@portal/components'

export class DependantOperationsWindow extends BaseComponent {

  readonly componentType: string = 'window'
  readonly closeBtn = new Button(this.mainLocator.getByTestId('CloseOutlinedIcon'), 'Close')
  readonly operationsList = new OperationWithMetaList(this.mainLocator)

  constructor(page: Page) {
    super(page.getByRole('dialog'), 'Dependant Operations')
  }
}
