import type { Locator } from '@playwright/test'
import { Checkbox, Content, Link, ListItem, Title } from '@shared/components/base'

export class OperationWithMetaListItem extends ListItem {

  readonly checkbox = new Checkbox(this.mainLocator.getByRole('checkbox'), this.componentName, `${this.componentType} checkbox`)
  readonly title = new Title(this.mainLocator.getByTestId('OperationTitle'), this.componentName, `${this.componentType} title`)
  readonly link = new Link(this.mainLocator.getByRole('link'), this.componentName, `${this.componentType} link`)
  readonly meta = new Content(this.mainLocator.getByTestId('OperationPath'), this.componentName, `${this.componentType} meta`)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
