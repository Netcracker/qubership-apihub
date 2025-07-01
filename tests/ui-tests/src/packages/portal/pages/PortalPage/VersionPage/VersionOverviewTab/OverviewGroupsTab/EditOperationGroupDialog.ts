import type { Page } from '@playwright/test'
import { BaseComponent, Content, SearchBar } from '@shared/components/base'
import { BaseSaveDialog } from '@shared/components/custom'
import { OperationsTabSidebar } from '@portal/components'
import { OperationGroupDialogList } from './EditOperationGroupDialog/OperationGroupDialogList'
import { ExchangeButton } from './EditOperationGroupDialog/ExchangeButton'

export class EditOperationGroupDialog extends BaseSaveDialog {

  readonly searchbar = new SearchBar(this.rootLocator.getByTestId('SearchOperations'), 'Operations')
  readonly sidebar = new OperationsTabSidebar(this.rootLocator)
  readonly leftList = new OperationGroupDialogList(this.rootLocator.getByTestId('LeftList'), 'Left')
  readonly rightList = new OperationGroupDialogList(this.rootLocator.getByTestId('RightList'), 'Right')
  readonly toLeftBtn = new ExchangeButton(this.rootLocator.getByTestId('ToLeftButton'), 'To Left')
  readonly toRightBtn = new ExchangeButton(this.rootLocator.getByTestId('ToRightButton'), 'To Right')
  readonly operationGroupLimit = new Content(this.rootLocator.getByTestId('OperationGroupLimit'), 'Operation Group Limit')
  readonly tooltip = new BaseComponent(this.rootLocator.page().getByRole('tooltip'), 'tooltip')

  constructor(page: Page) {
    super(page)
  }
}
