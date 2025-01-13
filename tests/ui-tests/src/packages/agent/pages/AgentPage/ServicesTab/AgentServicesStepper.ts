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
import { AgentServiceTabStepIndicator } from './AgentServicesStepper/AgentServicesStepIndicator'
import { Button } from '@shared/components/base'

export class AgentServicesStepper {

  readonly discoverIndicator = new AgentServiceTabStepIndicator(this.page.getByTestId('StepIndicator-discover-services'), 'Discover')
  readonly snapshotIndicator = new AgentServiceTabStepIndicator(this.page.getByTestId('StepIndicator-create-snapshot'), 'Snapshot')
  readonly validationIndicator = new AgentServiceTabStepIndicator(this.page.getByTestId('StepIndicator-validation-results'), 'Validation')
  readonly promoteIndicator = new AgentServiceTabStepIndicator(this.page.getByTestId('StepIndicator-promote-version'), 'Promote')
  readonly backBtn = new Button(this.page.getByTestId('BackButton'), 'Back')
  readonly nextBtn = new Button(this.page.getByTestId('NextButton'), 'Next')

  constructor(private readonly page: Page) {
  }
}
