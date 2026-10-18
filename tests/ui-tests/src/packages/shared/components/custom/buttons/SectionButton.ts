import type { Locator } from '@playwright/test'
import { Button, CollapseButton, ExpandButton } from '@shared/components/base'

export class SectionButton extends Button {

  readonly componentType: string = 'section button'
  readonly expandBtn = new ExpandButton(this.mainLocator.getByTestId('ChevronRightIcon'), this.componentName)
  readonly collapseBtn = new CollapseButton(this.mainLocator.getByTestId('ExpandMoreIcon'), this.componentName)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
