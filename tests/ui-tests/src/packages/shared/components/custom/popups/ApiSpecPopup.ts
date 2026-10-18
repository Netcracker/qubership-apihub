import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { ApiSpecView, RawView } from '@shared/components/custom'

export class ApiSpecPopup {

  readonly docBtn = new Button(this.page.getByTestId('ModeButton-doc'))
  readonly rawBtn = new Button(this.page.getByTestId('ModeButton-raw'))
  readonly docView = new ApiSpecView(this.page)
  readonly rawView = new RawView(this.page)

  constructor(private readonly page: Page) { }
}
