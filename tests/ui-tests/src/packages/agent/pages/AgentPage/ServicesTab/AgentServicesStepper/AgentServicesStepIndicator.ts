import type { Locator } from '@playwright/test'
import { Content, Icon, Progressbar } from '@shared/components/base'

export class AgentServiceTabStepIndicator {

  readonly icon = new Icon(this.rootLocator.locator('.MuiStepLabel-iconContainer'), `${this.stepName} step`)
  readonly status = new Content(this.rootLocator.getByTestId('StepStatus'), `${this.stepName} step`, 'status')
  readonly progressBar = new Progressbar(this.rootLocator.getByRole('progressbar'), `${this.stepName} step`)

  constructor(private readonly rootLocator: Locator, private readonly stepName: string) {
  }
}
