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
import { Content, Icon, Progressbar } from '@shared/components/base'

export class AgentServiceTabStepIndicator {

  readonly icon = new Icon(this.rootLocator.locator('.MuiStepLabel-iconContainer'), `${this.stepName} step`)
  readonly status = new Content(this.rootLocator.getByTestId('StepStatus'), `${this.stepName} step`, 'status')
  readonly progressBar = new Progressbar(this.rootLocator.getByRole('progressbar'), `${this.stepName} step`)

  constructor(private readonly rootLocator: Locator, private readonly stepName: string) {
  }
}
