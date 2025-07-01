import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseCancelDialog } from '@shared/components/custom'

export class MethodsForUploadDialog extends BaseCancelDialog {

  readonly toPortalBtn = new Button(this.rootLocator.getByTestId('ToPortalButton'), 'Create a new version in the Portal')
  readonly toAgentBtn = new Button(this.rootLocator.getByTestId('ToAgentButton'), 'Go to the Agent')
  readonly gotItBtn = new Button(this.rootLocator.getByTestId('GotItButton'), 'Got it')

  constructor(page: Page) {
    super(page)
  }
}
