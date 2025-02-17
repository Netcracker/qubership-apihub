import type { Page } from '@playwright/test'
import { Avatar, Button } from '@shared/components/base'
import { SystemInfoPopup } from '../popups/SystemInfoPopup'
import { MainUserMenu } from '../menus/MainUserMenu'

export class MainPageHeader {

  private readonly rootLocator = this.page.getByTestId('AppHeader')
  readonly portalBtn = new Button(this.rootLocator.getByTestId('PortalHeaderButton'), 'Portal')
  readonly agentBtn = new Button(this.rootLocator.getByTestId('AgentHeaderButton'), 'Agent')
  readonly globalSearchBtn = new Button(this.rootLocator.getByTestId('GlobalSearchButton'), 'Global Search')
  readonly sysInfoBtn = new Button(this.rootLocator.getByTestId('SystemInfoButton'), 'System information')
  readonly userAvatar = new Avatar(this.rootLocator.getByTestId('AppUserAvatar'), 'User')

  readonly userMenu = new MainUserMenu(this.rootLocator)
  readonly sysInfoPopup = new SystemInfoPopup(this.page)

  constructor(protected readonly page: Page) { }
}
