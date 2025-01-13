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
