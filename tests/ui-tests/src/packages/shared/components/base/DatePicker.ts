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

import type { Locator, Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseComponent } from './BaseComponent'

export class DatePicker extends BaseComponent {

  private readonly page = this.rootLocator.page()
  readonly monthBtn = new Button(this.page.locator('.rmdp-header-values').locator('span').first(), 'Month selecting')
  readonly yearBtn = new Button(this.page.locator('.rmdp-header-values').locator('span').last(), 'Year selecting')
  readonly todayBtn = new Button(this.page.locator('.rmdp-week .rmdp-today').locator('span'), 'Today')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator.getByRole('textbox'), componentName, componentType || 'date picker')
  }

  dateCell(value: string): Button {
    const pattern = new RegExp(`^${value}$`)
    return new Button(this.page.locator('.rmdp-day').locator('span').filter({ hasText: pattern }), value)
  }
}
