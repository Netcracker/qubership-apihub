import type { Locator } from '@playwright/test'
import { BaseComponent } from './BaseComponent'
import { Link } from '@shared/components/base/Link'

export class TableCell extends BaseComponent {

  readonly link = new Link(this.rootLocator.getByRole('link'), this.componentName)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'table cell')
  }
}
