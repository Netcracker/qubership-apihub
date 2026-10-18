import type { Page } from '@playwright/test'
import { BaseComponent, Button } from '@shared/components/base'
import { OperationWithMetaList } from '@portal/components'

export class DependantOperationsWindow extends BaseComponent {

  readonly componentType: string = 'window'
  readonly closeBtn = new Button(this.mainLocator.getByTestId('CloseOutlinedIcon'), 'Close')
  readonly operationsList = new OperationWithMetaList(this.mainLocator)

  constructor(page: Page) {
    super(page.getByRole('dialog'), 'Dependant Operations')
  }
}
