import type { Page } from '@playwright/test'
import { ListItem, Select } from '@shared/components/base'

export class ApiTypeSelect extends Select {

  readonly restApiItm = new ListItem(this.page.getByTestId('MenuItem-rest'), 'REST API')
  readonly graphQlItm = new ListItem(this.page.getByTestId('MenuItem-graphql'), 'GraphQL')

  constructor(page: Page) {
    super(page.getByTestId('ApiTypeSelector'), 'API Type')
  }
}
