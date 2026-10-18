import type { Page } from '@playwright/test'
import { Button, Content, FilesUploader, TextField } from '@shared/components/base'
import { BaseCancelDialog } from '@shared/components/custom'
import type { UploadedTestFile } from '@shared/entities'

type CreateRulesetDialogParams = Partial<{
  rulesetName?: string
  file?: UploadedTestFile
}>

export class CreateRulesetDialog extends BaseCancelDialog {
  readonly nameTxtFld = new TextField(this.rootLocator.getByTestId('NameTextField'), 'Name')
  readonly filesUploader = new FilesUploader(this.rootLocator.getByTestId('UploadButtonInput'), 'Ruleset')
  readonly fileUploadAlert = new Content(this.rootLocator.getByRole('alert'), 'File Upload Alert')
  readonly browseBtn = new Button(this.rootLocator.getByTestId('BrowseButton'), 'Browse')
  readonly createBtn = new Button(this.rootLocator.getByTestId('CreateButton'), 'Create')

  constructor(page: Page) {
    super(page)
  }

  async fillForm({ file, rulesetName }: CreateRulesetDialogParams): Promise<void> {
    if (rulesetName) {
      await this.nameTxtFld.fill(rulesetName)
    }
    if (file) {
      const { path, name } = file
      await this.filesUploader.setInputFiles({ name, path })
    }
  }
}
