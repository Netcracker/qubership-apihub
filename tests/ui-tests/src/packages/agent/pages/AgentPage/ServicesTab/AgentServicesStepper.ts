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
