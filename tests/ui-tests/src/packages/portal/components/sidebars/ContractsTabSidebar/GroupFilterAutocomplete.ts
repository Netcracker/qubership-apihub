import type { Locator } from '@playwright/test'
import { Autocomplete, ListItem } from '@shared/components/base'

export class GroupFilterAutocomplete extends Autocomplete {

  readonly allItm = new ListItem(this.mainLocator.page().getByTestId('FilterByGroup-Option-all'), 'All')
  readonly ungroupedItm = new ListItem(this.mainLocator.page().getByTestId('FilterByGroup-Option-ungrouped'), 'Ungrouped')

  constructor(rootLocator: Locator) {
    super(rootLocator.getByTestId('OperationGroupFilter'), 'Group Filter')
  }
}
