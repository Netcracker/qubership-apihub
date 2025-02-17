import type { Locator } from '@playwright/test'
import { Autocomplete, Chip, ListItem } from '@shared/components/base'

export class GsMethodsAutocomplete extends Autocomplete {

  readonly getItm = new ListItem(this.mainLocator.page().getByTestId('GetOption'), 'GET')
  readonly postItm = new ListItem(this.mainLocator.page().getByTestId('PostOption'), 'POST')
  readonly putItm = new ListItem(this.mainLocator.page().getByTestId('PutOption'), 'PUT')
  readonly patchItm = new ListItem(this.mainLocator.page().getByTestId('PatchOption'), 'PATCH')
  readonly deleteItm = new ListItem( this.mainLocator.page().getByTestId('DeleteOption'), 'DELETE')
  readonly chipGet = new Chip(this.mainLocator.page().getByRole('button', { name: 'get' }), 'GET')
  readonly chipPost = new Chip(this.mainLocator.page().getByRole('button', { name: 'post' }), 'POST')
  readonly chipPut = new Chip(this.mainLocator.page().getByRole('button', { name: 'put' }), 'PUT')
  readonly chipPatch = new Chip(this.mainLocator.page().getByRole('button', { name: 'patch' }), 'PATCH')
  readonly chipDelete = new Chip(this.mainLocator.page().getByRole('button', { name: 'delete' }), 'DELETE')

  constructor(parentLocator: Locator) {
    super(parentLocator.getByTestId('MethodsAutocomplete'), 'Methods')
  }
}
