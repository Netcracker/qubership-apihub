import type { Locator } from '@playwright/test'
import { Autocomplete, Chip, ListItem } from '@shared/components/base'

export class GsDetailedScopeAutocomplete extends Autocomplete {

  readonly propertiesItm = new ListItem(this.page.getByTestId('Properties / ParameterOption'), 'Properties')
  readonly annotationItm = new ListItem(this.page.getByTestId('AnnotationOption'), 'Annotation')
  readonly examplesItm = new ListItem(this.page.getByTestId('ExamplesOption'), 'Examples')
  readonly propertiesChip = new Chip(this.page.getByRole('button', { name: 'properties' }), 'Properties')
  readonly annotationChip = new Chip(this.page.getByRole('button', { name: 'annotation' }), 'Annotation')
  readonly examplesChip = new Chip(this.page.getByRole('button', { name: 'examples' }), 'Examples')

  constructor(rootLocator: Locator) {
    super(rootLocator.getByTestId('DetailedSearchScopeAutocomplete'), 'Detailed search scope')
  }
}
