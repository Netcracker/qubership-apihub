import type { Locator } from '@playwright/test'
import { Autocomplete, Button, DatePicker } from '@shared/components/base'
import { GsVersionStatusAutocomplete } from './GsFilters/GsVersionStatusAutocomplete'
import { ApiTypeAutocomplete } from '@portal/components/autocompletes/ApiTypeAutocomplete'

export class GsFilters {

  readonly acWorkspace = new Autocomplete(this.locator.getByTestId('WorkspaceAutocomplete'), 'Workspace')
  readonly acGroup = new Autocomplete(this.locator.getByTestId('GroupAutocomplete'), 'Group')
  readonly acPackage = new Autocomplete(this.locator.getByTestId('PackageAutocomplete'), 'Package')
  readonly acVersion = new Autocomplete(this.locator.getByTestId('PackageVersionAutocomplete'), 'Package version')
  readonly acVersionStatus = new GsVersionStatusAutocomplete(this.locator)
  readonly datePicker = new DatePicker(this.locator.getByTestId('DatePicker'), 'Global Search')
  readonly acApiType = new ApiTypeAutocomplete(this.locator)
  readonly btnReset = new Button(this.locator.getByTestId('ResetButton'), 'Reset')

  constructor(private readonly locator: Locator) { }
}
