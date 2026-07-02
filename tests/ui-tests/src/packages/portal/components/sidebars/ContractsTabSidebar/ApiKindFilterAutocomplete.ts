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
