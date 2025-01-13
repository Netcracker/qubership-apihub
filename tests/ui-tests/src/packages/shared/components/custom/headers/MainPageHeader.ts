/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
