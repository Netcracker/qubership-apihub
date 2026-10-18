import type { Locator } from '@playwright/test'
import { Select } from '@shared/components/base'
import { OperationWithMetaList } from '@portal/components'

export class OperationSelect extends Select {

  readonly recent = new OperationWithMetaList(this.page.getByTestId('RecentOperationsSection'))
  readonly related = new OperationWithMetaList(this.page.getByTestId('RelatedOperationsSection'))

  constructor(parentLocator: Locator) {
    super(parentLocator.getByTestId('OperationSelector'), 'Operations')
  }
}
