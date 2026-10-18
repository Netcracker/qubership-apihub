import type { Locator } from '@playwright/test'
import { BaseComponent, Content, Title } from '@shared/components/base'
import { OperationChangesSummary } from './OperationChangesSummary'

export class OperationComparisonSummary extends BaseComponent {

  readonly componentType: string = 'comparison summary'
  readonly title = new Title(this.rootLocator.getByTestId('OperationTitle'), this.componentName) //It's hard to add testid for `GroupCompareContent` in apihub-ui
  readonly path = new Content(this.rootLocator.getByTestId('OperationPath'), `Path ${this.componentName}`)
  readonly changes = new OperationChangesSummary(this.mainLocator.getByTestId('ChangesSummary'), this.componentName)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
