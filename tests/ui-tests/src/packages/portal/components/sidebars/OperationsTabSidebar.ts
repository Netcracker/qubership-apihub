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
import { Autocomplete, SearchBar, TagButton } from '@shared/components/base'
import { GroupFilterAutocomplete } from './OperationsTabSidebar/GroupFilterAutocomplete'
import { ApiKindFilterAutocomplete } from './OperationsTabSidebar/ApiKindFilterAutocomplete'

export class OperationsTabSidebar {

  readonly packageFilterAc = new Autocomplete(this.rootLocator.getByTestId('PackageFilter'), 'Package Filter')
  readonly groupFilterAc = new GroupFilterAutocomplete(this.rootLocator)
  readonly apiKindFilterAc = new ApiKindFilterAutocomplete(this.rootLocator)
  readonly searchbar = new SearchBar(this.rootLocator.getByTestId('SearchTags'), 'Tags')

  constructor(private readonly rootLocator: Locator) { }

  getTagButton(tagName?: string): TagButton {
    if (tagName) {
      return new TagButton(this.rootLocator.getByTestId('TagsList').getByRole('button', { name: tagName, exact: true }), tagName)
    } else {
      return new TagButton(this.rootLocator.getByTestId('TagsList').getByRole('button'))
    }
  }
}
