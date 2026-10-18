import type { Locator } from '@playwright/test'
import { Autocomplete, Chip, ListItem } from '@shared/components/base'

export class GsOperationTypesAutocomplete extends Autocomplete {

  readonly queryItm = new ListItem(this.mainLocator.page().getByTestId('QueryOption'), 'Query')
  readonly mutationItm = new ListItem(this.mainLocator.page().getByTestId('MutationOption'), 'Mutation')
  readonly subscriptionItm = new ListItem(this.mainLocator.page().getByTestId('SubscriptionOption'), 'Subscription')
  readonly chipQuery = new Chip(this.mainLocator.page().getByRole('button', { name: 'query' }), 'Query')
  readonly chipMutation = new Chip(this.mainLocator.page().getByRole('button', { name: 'mutation' }), 'Mutation')
  readonly chipSubscription = new Chip(this.mainLocator.page().getByRole('button', { name: 'subscription' }), 'Subscription')

  constructor(parentLocator: Locator) {
    super(parentLocator.getByTestId('OperationTypesAutocomplete'), 'Operation types')
  }
}
