import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseCompareToolbar } from '../BaseCompareToolbar'

export class CompareDashboardsToolbar extends BaseCompareToolbar {

  readonly allBtn = new Button(this.locator.getByTestId('ModeButton-all'), 'All')
  readonly restApiBtn = new Button(this.locator.getByTestId('ModeButton-rest'), 'REST API')
  readonly graphQlBtn = new Button(this.locator.getByTestId('ModeButton-graphql'), 'GraphQL')

  constructor(protected readonly page: Page) {
    super(page)
  }
}
