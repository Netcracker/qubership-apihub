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
import type { GetOperationParams } from '@portal/entities'
import { Button, OperationButton, Placeholder, SearchBar, TagButton } from '@shared/components/base'
import { DocumentFilterAutocomplete } from './CompareOperationsSidebar/DocumentFilterAutocomplete'

export class CompareOperationsSidebar {

  readonly filtersBtn = new Button(this.page.getByTestId('FiltersAccordionButton'), 'Filters')
  readonly documentFilterAc = new DocumentFilterAutocomplete(this.page)
  readonly searchbar = new SearchBar(this.page.getByTestId('SearchOperations'), 'Operations')
  readonly noSearchResultsPlaceholder = new Placeholder(this.page.getByTestId('NoSearchResultsPlaceholder'), 'No search results')

  constructor(private readonly page: Page) { }

  getTagButton(tagName?: string): TagButton {
    if (tagName) {
      return new TagButton(this.page.getByTestId('TagAccordionButton').filter({ hasText: tagName }), tagName)
    } else {
      return new TagButton(this.page.getByTestId('TagAccordionButton'))
    }
  }

  getOperationButton(props?: GetOperationParams): OperationButton {
    if (props) {
      return new OperationButton(this.page.getByTestId('OperationButton').filter({ hasText: `${props.title}${props.method.toUpperCase()}` }).first(),
        `${props.title} ${props.method.toUpperCase()}`)
    } else {
      return new OperationButton(this.page.getByTestId('OperationButton'))
    }
  }
}
