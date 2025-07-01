import type { Page } from '@playwright/test'
import { ApiSpecView, RawView } from '@shared/components/custom'
import { Button } from '@shared/components/base'

export class AgentSpecViewPopup {

  readonly closeBtn = new Button(this.page.getByTestId('CloseOutlinedIcon'), 'Close')
  readonly docBtn = new Button(this.page.getByTestId('ModeButton-doc'), 'Doc')
  readonly rawBtn = new Button(this.page.getByTestId('ModeButton-raw'), 'Raw')
  readonly apiSpecView = new ApiSpecView(this.page)
  readonly rawView = new RawView(this.page)

  constructor(private readonly page: Page) {
  }
}
