import type { Page } from '@playwright/test'
import { Autocomplete } from '@shared/components/base'
import { BaseSaveDialog } from '@shared/components/custom'

export class EditFileLabelsDialog extends BaseSaveDialog {

  readonly labelsAc = new Autocomplete(this.rootLocator.getByTestId('LabelsAutocomplete'), 'Labels')

  constructor(page: Page) {
    super(page)
  }

  async fillForm(labels: string[]): Promise<void> {
    for (const label of labels) {
      await this.labelsAc.fill(label)
      await this.page.keyboard.press('Enter')
    }
  }
}
