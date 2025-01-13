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
import { Button } from '@shared/components/base'
import { ApiSpecView, RawView } from '@shared/components/custom'

export class ApiSpecPopup {

  readonly docBtn = new Button(this.page.getByTestId('ModeButton-doc'))
  readonly rawBtn = new Button(this.page.getByTestId('ModeButton-raw'))
  readonly docView = new ApiSpecView(this.page)
  readonly rawView = new RawView(this.page)

  constructor(private readonly page: Page) { }
}
