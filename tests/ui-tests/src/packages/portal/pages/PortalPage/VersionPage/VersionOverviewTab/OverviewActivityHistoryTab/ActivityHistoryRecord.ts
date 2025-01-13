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

import type { Locator } from '@playwright/test'
import { Content, Icon, Link } from '@shared/components/base'

export class ActivityHistoryRecord extends Content {

  readonly date = new Content(this.mainLocator.getByTestId('ActivityDate'), this.componentName, 'Date')
  readonly user = new Content(this.mainLocator.getByTestId('UserView'), this.componentName, 'User')
  readonly token = new Content(this.mainLocator.getByTestId('TokenView'), this.componentName, 'Token')
  readonly userIcon = new Icon(this.mainLocator.getByTestId('UserIcon'), this.componentName, 'User')
  readonly tokenIcon = new Icon(this.mainLocator.getByTestId('KeyIcon'), this.componentName, 'Token')
  readonly message = new Content(this.mainLocator.getByTestId('ActivityMessage'), this.componentName, 'Activity Message')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'activity history record')
  }

  getLink(text: string): Link {
    return new Link(this.mainLocator.getByRole('link', { name: text, exact: true }))
  }
}
