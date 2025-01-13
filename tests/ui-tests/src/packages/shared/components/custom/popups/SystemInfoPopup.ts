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
