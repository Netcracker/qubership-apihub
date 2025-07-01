import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseCompareToolbar } from '../BaseCompareToolbar'

export class CompareOperationsToolbar extends BaseCompareToolbar {

  readonly docBtn = new Button(this.locator.getByTestId('ModeButton-doc'), 'Doc')
  readonly rawBtn = new Button(this.locator.getByTestId('ModeButton-raw'), 'Raw')

  constructor(protected readonly page: Page) {
    super(page)
  }
}
