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
