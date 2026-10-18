import type { Locator } from '@playwright/test'
import { Button } from '@shared/components/base'
import { ModelActionMenu } from './ModelButton/ModelActionMenu'

export class ModelButton extends Button {

  readonly componentType: string = 'model button'
  readonly actionMenu = new ModelActionMenu(this.mainLocator.getByTestId('ActionMenuButton'), this.componentName)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
