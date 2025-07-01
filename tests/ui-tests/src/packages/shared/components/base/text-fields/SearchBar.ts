import type { Locator } from '@playwright/test'
import { TextField } from './TextField'
import { Button } from '../buttons/Button'

export class SearchBar extends TextField {
  readonly clearBtn = new Button(this.rootLocator.getByTestId('CancelOutlinedIcon'), 'Search clear')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'search bar')
  }
}
