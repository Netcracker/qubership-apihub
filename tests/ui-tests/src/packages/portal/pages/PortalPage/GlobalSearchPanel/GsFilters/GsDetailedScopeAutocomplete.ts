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

export class GsDetailedScopeAutocomplete extends Autocomplete {

  readonly propertiesItm = new ListItem(this.page.getByTestId('Properties / ParameterOption'), 'Properties')
  readonly annotationItm = new ListItem(this.page.getByTestId('AnnotationOption'), 'Annotation')
  readonly examplesItm = new ListItem(this.page.getByTestId('ExamplesOption'), 'Examples')
  readonly propertiesChip = new Chip(this.page.getByRole('button', { name: 'properties' }), 'Properties')
  readonly annotationChip = new Chip(this.page.getByRole('button', { name: 'annotation' }), 'Annotation')
  readonly examplesChip = new Chip(this.page.getByRole('button', { name: 'examples' }), 'Examples')

  constructor(rootLocator: Locator) {
    super(rootLocator.getByTestId('DetailedSearchScopeAutocomplete'), 'Detailed search scope')
  }
}
