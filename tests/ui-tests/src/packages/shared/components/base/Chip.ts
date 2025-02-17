import { type Locator, test as setup } from '@playwright/test'
import { BaseComponent } from './BaseComponent'
import { Button } from './buttons/Button'

export class Chip extends BaseComponent {

  private readonly removeBtn = new Button(this.mainLocator.getByTestId('CancelIcon').or(this.mainLocator.getByTestId('CloseOutlinedIcon')), 'Remove')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'chip')
  }

  async remove(): Promise<void> {
    await setup.step(`Remove "${this.componentName}" ${this.componentType}`, async () => {
      await this.hover()
      await this.removeBtn.click()
    }, { box: true })
  }
}
