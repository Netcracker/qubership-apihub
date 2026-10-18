import type { Page } from '@playwright/test'
import { AGENT_USER_GUIDE, PORTAL_USER_GUIDE } from '@shared/entities'
import { Button, Content, Link } from '@shared/components/base'

export class SystemInfoPopup {

  readonly closeBtn = new Button(this.page.getByTestId('CloseOutlinedIcon'), 'Close')
  readonly content = new Content(this.page.getByTestId('SystemInfoContent'), 'System Info')
  readonly portalUserGuideLink = new Link(this.content.mainLocator.getByRole('link', {
    name: PORTAL_USER_GUIDE,
    exact: true,
  }), PORTAL_USER_GUIDE)
  readonly agentUserGuideLink = new Link(this.content.mainLocator.getByRole('link', {
    name: AGENT_USER_GUIDE,
    exact: true,
  }), AGENT_USER_GUIDE)

  constructor(private readonly page: Page) { }
}
