import type { Locator } from '@playwright/test'
import { BaseComponent, Icon, Link, TableCell, TableRow } from '@shared/components/base'

export class OverviewRevisionRow extends TableRow {

  readonly componentType = 'revision row'
  readonly revisionCell = new TableCell(this.rootLocator.getByTestId('Cell-version'), `${this.componentName} Revision`)
  readonly statusCell = new TableCell(this.rootLocator.getByTestId('Cell-version-status'), `${this.componentName} Status`)
  readonly labelsCell = new TableCell(this.rootLocator.getByTestId('Cell-labels'), `${this.componentName} Labels`)
  readonly publicationDateCell = new TableCell(this.rootLocator.getByTestId('Cell-publication-date'), `${this.componentName} Publication Date`)
  readonly publishedByCell = new TableCell(this.rootLocator.getByTestId('Cell-published-by'), `${this.componentName} Published By`)
  readonly link = new Link(this.rootLocator.getByRole('link'), `${this.componentName} Revision`)
  readonly infoIcon = new Icon(this.rootLocator.getByTestId('InfoIcon'), `${this.componentName} Info`)
  readonly infoTooltip = new BaseComponent(this.rootLocator.page().getByRole('tooltip'), `${this.componentName} Info`, 'tooltip')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
