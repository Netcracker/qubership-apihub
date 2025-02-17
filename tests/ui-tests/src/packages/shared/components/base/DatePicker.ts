import type { Locator, Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseComponent } from './BaseComponent'

export class DatePicker extends BaseComponent {

  private readonly page = this.rootLocator.page()
  readonly monthBtn = new Button(this.page.locator('.rmdp-header-values').locator('span').first(), 'Month selecting')
  readonly yearBtn = new Button(this.page.locator('.rmdp-header-values').locator('span').last(), 'Year selecting')
  readonly todayBtn = new Button(this.page.locator('.rmdp-week .rmdp-today').locator('span'), 'Today')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator.getByRole('textbox'), componentName, componentType || 'date picker')
  }

  dateCell(value: string): Button {
    const pattern = new RegExp(`^${value}$`)
    return new Button(this.page.locator('.rmdp-day').locator('span').filter({ hasText: pattern }), value)
  }
}
