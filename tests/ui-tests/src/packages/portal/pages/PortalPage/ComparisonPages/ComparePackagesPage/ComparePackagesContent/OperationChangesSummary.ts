import type { Locator } from '@playwright/test'
import { BaseComponent, Content } from '@shared/components/base'

export class OperationChangesSummary extends BaseComponent {

  readonly componentType: string = 'changes summary'
  readonly breaking = new Content(this.mainLocator.getByTestId('breaking'), `${this.componentName} Breaking Сhanges`)
  readonly semiBreaking = new Content(this.mainLocator.getByTestId('semi-breaking'), `${this.componentName} Changes Requiring Attention`)
  readonly deprecated = new Content(this.mainLocator.getByTestId('deprecated'), `${this.componentName} Deprecated Сhanges`)
  readonly nonBreaking = new Content(this.mainLocator.getByTestId('non-breaking'), `${this.componentName} Non-breaking Сhanges`)
  readonly annotation = new Content(this.mainLocator.getByTestId('annotation'), `${this.componentName} Annotation Сhanges`)
  readonly unclassified = new Content(this.mainLocator.getByTestId('unclassified'), `${this.componentName} Unclassified Сhanges`)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
