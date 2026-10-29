import type { Page } from '@playwright/test'
import { AGENT_USER_GUIDE, PORTAL_USER_GUIDE } from '@shared/entities'
import { Button, Content, Link } from '@shared/components/base'

export class SystemInfoPopup {

  readonly closeBtn = new Button(this.page.getByTestId('CloseOutlinedIcon'), 'Close')
  readonly content = new Content(this.page.getByTestId('SystemInfoContent'), 'System Info')
  readonly backendVersion = new Content(this.page.getByTestId('SystemInfoBackendVersion'), 'Backend version')
  readonly frontendVersion = new Content(this.page.getByTestId('SystemInfoFrontendVersion'), 'Frontend version')
  // The image that the app ships in: `<branch>.<commit>.<commit time>`.
  readonly frontendImageVersion = new Content(this.page.getByTestId('SystemInfoFrontendVersionImageVersion'), 'Frontend image version')
  readonly apiProcessorVersion = new Content(this.page.getByTestId('SystemInfoApiProcessorVersion'), 'API Processor version')
  readonly apiProcessorImageVersion = new Content(this.page.getByTestId('SystemInfoApiProcessorVersionImageVersion'), 'API Processor image version')
  readonly portalUserGuideLink = new Link(this.content.mainLocator.getByRole('link', {
    name: PORTAL_USER_GUIDE,
    exact: true,
  }), PORTAL_USER_GUIDE)
  readonly agentUserGuideLink = new Link(this.content.mainLocator.getByRole('link', {
    name: AGENT_USER_GUIDE,
    exact: true,
  }), AGENT_USER_GUIDE)

  // A row of a registered extension, by the name the extension is registered under.
  extensionVersion(extensionName: string): Content {
    return new Content(this.page.getByTestId(`SystemInfoExtensionVersion-${extensionName}`), `${extensionName} version`)
  }

  constructor(private readonly page: Page) { }
}
