import type { Locator } from '@playwright/test'
import { Autocomplete, ListItem } from '@shared/components/base'

export class ApiTypeAutocomplete extends Autocomplete {

  readonly restApiItm = new ListItem(this.mainLocator.page().getByTestId('Option-rest'), 'REST API')
  readonly graphQlItm = new ListItem(this.mainLocator.page().getByTestId('Option-graphql'), 'GraphQL API')

  constructor(rootLocator: Locator) {
    super(rootLocator.getByTestId('ApiTypeAutocomplete'), 'API Type')
  }
}
