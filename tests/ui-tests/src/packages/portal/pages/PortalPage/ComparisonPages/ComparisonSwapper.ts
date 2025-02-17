import type { Page } from '@playwright/test'
import { Button, Content, Title } from '@shared/components/base'

export class ComparisonSwapper {

  readonly leftTitle = new Title(this.page.getByTestId('LeftSwapperHeader').getByTestId('SwapperTitle'), 'Left comparison')
  readonly rightTitle = new Title(this.page.getByTestId('RightSwapperHeader').getByTestId('SwapperTitle'), 'Right comparison')
  readonly leftBreadcrumbs = new Content(this.page.getByTestId('LeftSwapperHeader').getByTestId('ComparedPackagesBreadcrumbs'), 'Left breadcrumbs')
  readonly rightBreadcrumbs = new Content(this.page.getByTestId('RightSwapperHeader').getByTestId('ComparedPackagesBreadcrumbs'), 'Right breadcrumbs')
  readonly swapBtn = new Button(this.page.getByTestId('SwapButton'), 'Swap')
  readonly editBtn = new Button(this.page.getByTestId('EditButton'), 'Edit')

  constructor(private readonly page: Page) { }
}
