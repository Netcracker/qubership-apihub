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
import { Autocomplete, Chip, ListItem } from '@shared/components/base'

export class GsMethodsAutocomplete extends Autocomplete {

  readonly getItm = new ListItem(this.mainLocator.page().getByTestId('GetOption'), 'GET')
  readonly postItm = new ListItem(this.mainLocator.page().getByTestId('PostOption'), 'POST')
  readonly putItm = new ListItem(this.mainLocator.page().getByTestId('PutOption'), 'PUT')
  readonly patchItm = new ListItem(this.mainLocator.page().getByTestId('PatchOption'), 'PATCH')
  readonly deleteItm = new ListItem( this.mainLocator.page().getByTestId('DeleteOption'), 'DELETE')
  readonly chipGet = new Chip(this.mainLocator.page().getByRole('button', { name: 'get' }), 'GET')
  readonly chipPost = new Chip(this.mainLocator.page().getByRole('button', { name: 'post' }), 'POST')
  readonly chipPut = new Chip(this.mainLocator.page().getByRole('button', { name: 'put' }), 'PUT')
  readonly chipPatch = new Chip(this.mainLocator.page().getByRole('button', { name: 'patch' }), 'PATCH')
  readonly chipDelete = new Chip(this.mainLocator.page().getByRole('button', { name: 'delete' }), 'DELETE')

  constructor(parentLocator: Locator) {
    super(parentLocator.getByTestId('MethodsAutocomplete'), 'Methods')
  }
}
