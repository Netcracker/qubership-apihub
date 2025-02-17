import type { Locator } from '@playwright/test'
import { Button } from '../buttons/Button'
import { TextField } from './TextField'
import { ListItem } from '../ListItem'
import { Content } from '../Content'
import { Chip } from '@shared/components/base'
import { test as report } from 'playwright/test'

export class Autocomplete extends TextField {

  readonly mainLocator = this.rootLocator.getByRole('combobox')
  readonly dropdownBtn = new Button(this.rootLocator.getByTestId('ArrowDropDownIcon'), 'Dropdown')
  readonly errorMsg = new Content(this.rootLocator.locator('.MuiFormHelperText-root.Mui-error'), 'Error message')
  protected readonly page = this.mainLocator.page()

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'autocomplete')
  }

  getListItem(itemName?: string, options = { exact: true }): ListItem {
    if (itemName) {
      return new ListItem(this.page.getByRole('option', { name: itemName, ...options }).first(), itemName)
    }
    return new ListItem(this.page.getByRole('option'))
  }

  getChip(chipName?: string): Chip {
    if (chipName) {
      return new Chip(this.page.locator('.MuiChip-root').filter({ hasText: chipName }).first(), chipName)
    }
    return new Chip(this.page.locator('.MuiChip-root'))
  }

  async set(listItem: string | string[], options?: { clearBefore?: boolean; fillItemName?: boolean }): Promise<void> {
    const _options = {
      clearBefore: false,
      fillItemName: false,
      ...options,
    }
    const selectListItem = async (listItem: string): Promise<void> => {
      await report.step(`Select "${listItem}"`, async () => {
        if (_options.fillItemName) {
          await this.fill(listItem)
        } else {
          await this.click()
        }
        await this.getListItem(listItem, { exact: false }).click()
      })
    }

    await report.step(`Set "${this.componentName}" autocomplete`, async () => {
      if (_options.clearBefore) {
        await this.clear()
      }
      if (listItem instanceof Array) {
        for (const item of listItem) {
          await selectListItem(item)
        }
      } else {
        await selectListItem(listItem)
      }
    })
  }
}
