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
import { Checkbox, Content, TextField } from '@shared/components/base'
import { BaseSaveDialog } from '@shared/components/custom'

export class EditRestGroupingPrefixDialog extends BaseSaveDialog {

  readonly prefixTxtFld = new TextField(this.rootLocator.getByTestId('PrefixTextField'), 'Grouping prefix')
  readonly recalculateChx = new Checkbox(this.rootLocator.getByTestId('RecalculateCheckbox'), 'Recalculate groups')
  readonly errorMsg = new Content(this.prefixTxtFld.rootLocator, 'Error') //Impossible to add a precision test ID in the APIHUBUI

  constructor(page: Page) {
    super(page)
  }
}
