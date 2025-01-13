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
import { Autocomplete, ListItem } from '@shared/components/base'

export class ApiKindFilterAutocomplete extends Autocomplete {

  readonly allItm = new ListItem(this.mainLocator.page().getByTestId('Option-all'), 'All')
  readonly bwcItm = new ListItem(this.mainLocator.page().getByTestId('Option-bwc'), 'BWC')
  readonly noBwcItm = new ListItem(this.mainLocator.page().getByTestId('Option-no-bwc'), 'No BWC')
  readonly experimentalItm = new ListItem(this.mainLocator.page().getByTestId('Option-experimental'), 'Experimental')

  constructor(rootLocator: Locator) {
    super(rootLocator.getByTestId('ApiKindFilter'), 'API Kind Filter')
  }
}
