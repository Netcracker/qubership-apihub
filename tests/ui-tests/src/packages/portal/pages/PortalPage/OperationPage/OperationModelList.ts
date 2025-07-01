import { type Page } from '@playwright/test'
import { SectionButton } from '@shared/components/custom'
import { ModelButton } from './OperationModelList/ModelButton'

export class OperationModelList {

  constructor(private readonly page: Page) { }

  getSectionButton(section: string): SectionButton {
    return new SectionButton(this.page.getByTestId('OperationModelList').getByRole('treeitem', { name: section }).first(), section)
  }

  getModelButton(model: string): ModelButton {
    return new ModelButton(this.page.getByTestId('OperationModelList').getByRole('treeitem', { name: model }).first(), model)
  }
}
