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
import { Placeholder } from '@shared/components/base'
import { GsSearchResultRow } from './GsSearchResults/GsSearchResultRow'

export class GsSearchResults {

  readonly phNoOperations = new Placeholder(this.locator.getByTestId('NoOperationsPlaceholder'), 'No Operations')
  readonly phNoDocuments = new Placeholder(this.locator.getByTestId('NoDocumentsPlaceholder'), 'No Documents')
  readonly phNoPackages = new Placeholder(this.locator.getByTestId('NoPackagesPlaceholder'), 'No Packages')

  constructor(readonly locator: Locator) { }

  searchResultRow(
    searchResult?: { title: string },
    nth?: number,
  ): GsSearchResultRow {
    if (searchResult && nth) {
      return new GsSearchResultRow(this.locator
          .getByTestId('SearchResultRow')
          .filter({ has: this.locator.page().getByRole('link', { name: searchResult.title, exact: true }) })
          .nth(nth - 1),
        `${searchResult.title} #${nth}`)
    }
    if (searchResult) {
      return new GsSearchResultRow(this.locator
          .getByTestId('SearchResultRow')
          .filter({ has: this.locator.page().getByRole('link', { name: searchResult.title, exact: true }) }),
        searchResult.title)
    }
    if (nth) {
      return new GsSearchResultRow(this.locator.getByTestId('SearchResultRow').nth(nth - 1),
        `#${nth}`)
    }
    return new GsSearchResultRow(this.locator.getByTestId('SearchResultRow'))
  }
}
