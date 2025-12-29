import type { Page } from '@playwright/test'
import { BaseComponent, Button, Title } from '@shared/components/base'

export class ProblemPopUp extends BaseComponent {
  readonly title = new Title(this.rootLocator.locator('.peekview-title'), 'Problem popup')
  readonly message = new BaseComponent(this.rootLocator.locator('.message'), 'Problem popup', 'message')
  readonly iconContainer = new BaseComponent(
    this.rootLocator.locator('.codicon').first(),
    'Problem popup',
    'icon container',
  )
  readonly nextProblemBtn = new Button(
    this.rootLocator.locator('.codicon-marker-navigation-next'),
    'Go to Next Problem',
  )
  readonly previousProblemBtn = new Button(
    this.rootLocator.locator('.codicon-marker-navigation-previous'),
    'Go to Previous Problem',
  )
  readonly closeBtn = new Button(this.rootLocator.locator('.codicon-close'), 'Close')

  constructor(page: Page) {
    super(page.locator('.peekview-widget'), 'Problem', 'popup')
  }
}
