import type { Locator } from '@playwright/test'
import { descriptive } from '@shared/components/decorator'
import type { ClearOptions, FillOptions, TypeOptions } from '@shared/entities'
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

  @descriptive('Fill')
  async fill(value: string, options?: FillOptions): Promise<void> {
    await this.mainLocator.fill(value, options)
  }

  @descriptive('Type')
  async type(value: string, options?: TypeOptions): Promise<void> {
    await this.mainLocator.pressSequentially(value, options)
  }

  @descriptive('Clear')
  async clear(options?: ClearOptions): Promise<void> {
    await this.mainLocator.clear(options)
  }
}
