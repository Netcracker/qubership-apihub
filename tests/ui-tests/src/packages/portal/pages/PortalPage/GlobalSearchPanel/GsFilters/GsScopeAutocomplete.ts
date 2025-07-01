import type { Locator } from '@playwright/test'
import { Autocomplete, Chip, ListItem } from '@shared/components/base'

export class GsScopeAutocomplete extends Autocomplete {

  readonly responseItm = new ListItem(this.page.getByTestId('ResponseOption'), 'Response')
  readonly requestItm = new ListItem(this.page.getByTestId('RequestOption'), 'Request')
  readonly argumentItm = new ListItem(this.page.getByTestId('ArgumentOption'), 'Argument')
  readonly propertyItm = new ListItem(this.page.getByTestId('PropertyOption'), 'Property')
  readonly annotationItm = new ListItem(this.page.getByTestId('AnnotationOption'), 'Annotation')
  readonly chipResponse = new Chip(this.page.getByRole('button', { name: 'response' }), 'Response')
  readonly chipRequest = new Chip(this.page.getByRole('button', { name: 'request' }), 'Request')
  readonly chipArgument = new Chip(this.page.getByRole('button', { name: 'argument' }), 'Argument')
  readonly chipProperty = new Chip(this.page.getByRole('button', { name: 'property' }), 'Property')
  readonly chipAnnotation = new Chip(this.page.getByRole('button', { name: 'annotation' }), 'Annotation')

  constructor(parentLocator: Locator) {
    super(parentLocator.getByTestId('SearchScopeAutocomplete'), 'Search scope')
  }
}
