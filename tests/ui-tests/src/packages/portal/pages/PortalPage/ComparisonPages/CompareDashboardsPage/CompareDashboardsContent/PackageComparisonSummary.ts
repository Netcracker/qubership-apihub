import type { Locator } from '@playwright/test'
import { BaseComponent, Content } from '@shared/components/base'
import { OperationChangesSummary } from '../../ComparePackagesPage/ComparePackagesContent/OperationChangesSummary'

export class PackageComparisonSummary extends BaseComponent {

  readonly componentType: string = 'comparison summary'
  readonly dashboardPath = new Content(this.mainLocator.getByTestId('DashboardPath'), `Path of ${this.componentName}`)
  readonly packageVersionTitle = new Content(this.mainLocator.getByTestId('PackageVersionTitle'), `Version title of ${this.componentName}`)
  readonly packageVersionStatus = new Content(this.mainLocator.getByTestId('PackageVersionStatus'), `Publish status of ${this.componentName}`)
  readonly restApiChanges = new OperationChangesSummary(this.mainLocator.getByTestId('ChangesApiType-rest').getByTestId('ChangesSummary'), `REST API changes of ${this.componentName}`)
  readonly graphQlChanges = new OperationChangesSummary(this.mainLocator.getByTestId('ChangesApiType-graphql').getByTestId('ChangesSummary'), `GraphQL changes of ${this.componentName}`)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
