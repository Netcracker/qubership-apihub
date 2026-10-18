import type { Locator } from '@playwright/test'
import { BaseComponent, Chip, Content, Link } from '@shared/components/base'

export class GsSearchResultRow extends BaseComponent {

  readonly componentType: string = 'row'
  readonly pathToSearchResultItem = new Content(this.mainLocator.getByTestId('PathToSearchResultItem'), `Path to '${this.componentName}'`)
  readonly versionStatus = new Chip(this.mainLocator.getByTestId('VersionStatusChip'), `'${this.componentName}' package version status`)
  readonly link = new Link(this.mainLocator.getByRole('link'), this.componentName)
  readonly operationPathChip = new Chip(this.mainLocator.getByTestId('OperationPathChip'), `'${this.componentName}' operation type`)
  readonly operationPathSubtitle = new Chip(this.mainLocator.getByTestId('OperationPathSubtitle'), `'${this.componentName}' operation type`)
  readonly publicationDate = new Content(this.mainLocator.getByTestId('PublicationDateValue'), `'${this.componentName}' publication date`)
  readonly docContent = new Content(this.mainLocator.getByTestId('DocumentContent'), `'${this.componentName}' document`)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
