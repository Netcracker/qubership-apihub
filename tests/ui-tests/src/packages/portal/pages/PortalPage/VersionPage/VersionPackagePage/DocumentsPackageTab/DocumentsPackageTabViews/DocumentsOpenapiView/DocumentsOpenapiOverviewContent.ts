import type { ComponentParams } from '@shared/components/types'
import { Content } from '@shared/components/base'

export class DocumentsOpenapiOverviewContent extends Content {

  readonly labels = new Content(this.mainLocator.getByTestId('DocumentLabels'), 'Document labels')

  constructor(protected readonly params: ComponentParams) {
    super(params.locator, params.componentName, params.componentType)
  }
}
