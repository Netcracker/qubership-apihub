import type { Page } from '@playwright/test'
import { createItemGetter, type ItemGetterConfig } from '@services/utils'
import { BaseComponent, Title, Tooltip } from '@shared/components/base'

export class ActivationHistoryTooltip extends Tooltip {
  readonly title = new Title(
    this.rootLocator.getByTestId('ActivationHistoryTooltipTitle'),
    'Activation History tooltip',
  )

  private readonly activationRecordConfig: ItemGetterConfig<BaseComponent> = {
    constructor: BaseComponent,
    rootLocator: this.rootLocator.getByTestId('ActivationHistoryTooltipRecord'),
    componentTypes: {
      singular: 'activation record',
      plural: 'activation records',
    },
  }

  readonly getActivationRecord = createItemGetter(this.activationRecordConfig)

  constructor(protected readonly page: Page, componentName?: string) {
    super(page.getByRole('tooltip'), componentName, 'activation history tooltip')
  }
}
