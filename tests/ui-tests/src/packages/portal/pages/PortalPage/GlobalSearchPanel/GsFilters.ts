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
import { Autocomplete, Button, Checkbox, DatePicker } from '@shared/components/base'
import { GsVersionStatusAutocomplete } from './GsFilters/GsVersionStatusAutocomplete'
import { ApiTypeAutocomplete } from '@portal/components/autocompletes/ApiTypeAutocomplete'
import { GsScopeAutocomplete } from './GsFilters/GsScopeAutocomplete'
import { GsDetailedScopeAutocomplete } from './GsFilters/GsDetailedScopeAutocomplete'
import { GsMethodsAutocomplete } from './GsFilters/GsMethodsAutocomplete'
import { GsOperationTypesAutocomplete } from './GsFilters/GsOperationTypesAutocomplete'

export class GsFilters {

  readonly acWorkspace = new Autocomplete(this.locator.getByTestId('WorkspaceAutocomplete'), 'Workspace')
  readonly acGroup = new Autocomplete(this.locator.getByTestId('GroupAutocomplete'), 'Group')
  readonly acPackage = new Autocomplete(this.locator.getByTestId('PackageAutocomplete'), 'Package')
  readonly acVersion = new Autocomplete(this.locator.getByTestId('PackageVersionAutocomplete'), 'Package version')
  readonly acVersionStatus = new GsVersionStatusAutocomplete(this.locator)
  readonly datePicker = new DatePicker(this.locator.getByTestId('DatePicker'), 'Global Search')
  readonly chxSearchOnly = new Checkbox(this.locator.getByTestId('SearchOnlyCheckbox'), 'Search only')
  readonly acApiType = new ApiTypeAutocomplete(this.locator)
  readonly acScope = new GsScopeAutocomplete(this.locator)
  readonly acDetailedScope = new GsDetailedScopeAutocomplete(this.locator)
  readonly acMethods = new GsMethodsAutocomplete(this.locator)
  readonly acOperationTypes = new GsOperationTypesAutocomplete(this.locator)
  readonly btnReset = new Button(this.locator.getByTestId('ResetButton'), 'Reset')

  constructor(private readonly locator: Locator) { }
}
