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

export class GsScopeAutocomplete extends Autocomplete {

  readonly responseItm = new ListItem(this.page.getByTestId('ResponseOption'), 'Response')
  readonly requestItm = new ListItem(this.page.getByTestId('RequestOption'), 'Request')
  readonly argumentItm = new ListItem(this.page.getByTestId('ArgumentOption'), 'Argument')
  readonly propertyItm = new ListItem(this.page.getByTestId('PropertyOption'), 'Property')
  readonly annotationItm = new ListItem(this.page.getByTestId('AnnotationOption'), 'Annotation')
  readonly chipResponse = new Chip(this.page.getByRole('button', { name: 'response' }), 'Response')
  readonly chipRequest = new Chip(this.page.getByRole('button', { name: 'request' }), 'Request')
  readonly chipArgument = new Chip(this.page.getByRole('button', { name: 'argument' }), 'Argument')
  readonly chipProperty = new Chip(this.page.getByRole('button', { name: 'property' }), 'Property')
  readonly chipAnnotation = new Chip(this.page.getByRole('button', { name: 'annotation' }), 'Annotation')

  constructor(parentLocator: Locator) {
    super(parentLocator.getByTestId('SearchScopeAutocomplete'), 'Search scope')
  }
}
