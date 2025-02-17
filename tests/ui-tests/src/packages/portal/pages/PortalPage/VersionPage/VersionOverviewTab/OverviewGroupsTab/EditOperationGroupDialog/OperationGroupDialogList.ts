import type { Locator } from '@playwright/test'
import { OperationWithMetaList } from '@portal/components'
import { Checkbox, Placeholder, Title } from '@shared/components/base'

export class OperationGroupDialogList extends OperationWithMetaList {

  readonly title = new Title(this.rootLocator.getByRole('heading'), `${this.name} Operation List`)
  readonly allOperationsChx = new Checkbox(this.rootLocator.getByTestId('AllOperationsCheckbox').getByRole('checkbox'), 'All Operations')
  readonly noOperationsPh = new Placeholder( this.rootLocator.getByTestId('NoOperationsPlaceholder'), 'No Operations', `${this.name.toLowerCase()} placeholder`)

  constructor(
    protected readonly rootLocator: Locator,
    protected readonly name: string,
  ) {
    super(rootLocator, name)
  }
}
