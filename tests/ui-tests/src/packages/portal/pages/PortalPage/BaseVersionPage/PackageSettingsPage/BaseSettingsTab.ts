import type { Locator } from '@playwright/test'
import { Tab, Title } from '@shared/components/base'

export abstract class BaseSettingsTab extends Tab {

  readonly title = new Title(this.page.getByTestId('CardHeaderTitle'), 'Settings tab')

  protected constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'settings tab')
  }
}
