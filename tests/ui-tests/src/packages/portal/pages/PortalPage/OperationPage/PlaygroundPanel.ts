import { BaseComponent, Button, TextField } from '@shared/components/base'
import { type Page } from 'playwright/test'
import { AddCustomServerDialog } from './PlaygroundPanel/AddCustomServerDialog'
import { CustomServerSelect } from './PlaygroundPanel/CustomServerSelect'

export class PlaygroundPanel extends BaseComponent {

  readonly serverSlt = new CustomServerSelect(this.page)
  readonly sendBtn = new Button(this.mainLocator.getByRole('button', { name: 'Send' }), 'Send')
  readonly tokenTxtFld = new TextField(this.mainLocator.locator('label:has-text("Token")+span+div'), 'Token')
  readonly textFilterTxtFld = new TextField(this.mainLocator.locator('label:has-text("textFilter")+span+div'), 'textFilter')
  readonly typesTxtFld = new TextField(this.mainLocator.locator('label:has-text("types")+span+div'), 'textFilter')
  readonly addServerDialog = new AddCustomServerDialog(this.page)

  constructor(private readonly page: Page) {
    super(page.getByTestId('PlaygroundPanel'), 'Playground', 'panel')
  }
}
