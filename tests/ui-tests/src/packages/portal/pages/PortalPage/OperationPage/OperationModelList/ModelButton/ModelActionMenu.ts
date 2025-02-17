import type { Locator } from '@playwright/test'
import { DropdownMenu, ListItem } from '@shared/components/base'

export class ModelActionMenu extends DropdownMenu {

  readonly componentType: string = 'action menu'
  readonly dependantOperationsItm = new ListItem(this.mainLocator.page().getByTestId('DependantOperationsMenuItem'), 'Dependant operations')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
