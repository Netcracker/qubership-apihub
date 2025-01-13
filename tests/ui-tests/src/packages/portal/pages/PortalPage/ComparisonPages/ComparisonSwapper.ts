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
import { Button, Content, Title } from '@shared/components/base'

export class ComparisonSwapper {

  readonly leftTitle = new Title(this.page.getByTestId('LeftSwapperHeader').getByTestId('SwapperTitle'), 'Left comparison')
  readonly rightTitle = new Title(this.page.getByTestId('RightSwapperHeader').getByTestId('SwapperTitle'), 'Right comparison')
  readonly leftBreadcrumbs = new Content(this.page.getByTestId('LeftSwapperHeader').getByTestId('ComparedPackagesBreadcrumbs'), 'Left breadcrumbs')
  readonly rightBreadcrumbs = new Content(this.page.getByTestId('RightSwapperHeader').getByTestId('ComparedPackagesBreadcrumbs'), 'Right breadcrumbs')
  readonly swapBtn = new Button(this.page.getByTestId('SwapButton'), 'Swap')
  readonly editBtn = new Button(this.page.getByTestId('EditButton'), 'Edit')

  constructor(private readonly page: Page) { }
}
