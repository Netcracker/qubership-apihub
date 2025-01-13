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
import { Autocomplete, TextField } from '@shared/components/base'
import { BaseAddDialog } from '@shared/components/custom'

export class AddCustomServerDialog extends BaseAddDialog {

  readonly cloudAc = new Autocomplete(this.rootLocator.getByTestId('CloudAutocomplete'), 'Cloud')
  readonly namespaceAc = new Autocomplete(this.rootLocator.getByTestId('NamespaceAutocomplete'), 'Namespace')
  readonly serviceAc = new Autocomplete(this.rootLocator.getByTestId('ServiceAutocomplete'), 'Service')
  readonly urlTxtFld = new TextField(this.rootLocator.getByTestId('ServerUrlTextInput'), 'Server URL')

  constructor(page: Page) {
    super(page)
  }
}
