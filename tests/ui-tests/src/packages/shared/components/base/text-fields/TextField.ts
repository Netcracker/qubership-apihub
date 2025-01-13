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
import { descriptiveClear, descriptiveFill, descriptiveHover, descriptiveType } from '@shared/components/decorator'
import type { ClearOptions, FillOptions, HoverOptions, TypeOptions } from '@shared/entities'
import { BaseComponent } from '../BaseComponent'
import { Content } from '../Content'
import { Button } from '../buttons/Button'

export class TextField extends BaseComponent {
  readonly mainLocator = this.rootLocator.getByRole('textbox')
  readonly clearBtn = new Button(this.rootLocator.getByTestId('CloseIcon'), 'Text input clear')
  readonly errorMsg = new Content(this.rootLocator.locator('.Mui-error.MuiFormHelperText-root'), this.componentName, 'error message')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'text field')
  }

  async hover(options?: HoverOptions): Promise<void> {
    await descriptiveHover(this, options)
  }

  async fill(value: string, options?: FillOptions): Promise<void> {
    await descriptiveFill(this, value, options)
  }

  async type(value: string, options?: TypeOptions): Promise<void> {
    await descriptiveType(this, value, options)
  }

  async clear(options?: ClearOptions): Promise<void> {
    await descriptiveClear(this, options)
  }
}
