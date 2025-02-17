import type { Locator } from '@playwright/test'
import type { GetOperationWithMetaParams } from '@portal/entities'
import { OperationWithMetaListItem } from '@portal/components/lists/OperationWithMetaList/OperationWithMetaListItem'
import { TagButton } from '@shared/components/base'
import { nthPostfix } from '@services/utils'

export class OperationWithMetaList {

  constructor(protected readonly rootLocator: Locator, protected readonly name = '') { }

  getOperationListItem(operation?: GetOperationWithMetaParams): OperationWithMetaListItem
  getOperationListItem(nth?: number): OperationWithMetaListItem
  getOperationListItem(operationOrNth?: GetOperationWithMetaParams | number, nth?: number): OperationWithMetaListItem {
    let pattern: RegExp | undefined
    let path!: string
    if (typeof operationOrNth === 'object') {
      path = operationOrNth?.method && operationOrNth.path ? `${operationOrNth.method}${operationOrNth.path}` : `${operationOrNth.type}${operationOrNth.method}`
      const escapedPath = path.replace(/\*/, '\\*')
      pattern = new RegExp(`${escapedPath}$`)
    }
    if (typeof operationOrNth === 'object' && !nth) {
      return new OperationWithMetaListItem(this.rootLocator.getByTestId('OperationListItem').filter({ hasText: pattern }), path, `${this.name.toLowerCase()} list item`)
    }
    if (typeof operationOrNth === 'number') {
      return new OperationWithMetaListItem(this.rootLocator.getByTestId('OperationListItem').nth(operationOrNth - 1), '', `${operationOrNth}${nthPostfix(operationOrNth)} ${this.name.toLowerCase()} list item`)
    }
    if (!operationOrNth && !nth) {
      return new OperationWithMetaListItem(this.rootLocator.getByTestId('OperationListItem'))
    }
    if (operationOrNth && nth) {
      return new OperationWithMetaListItem(this.rootLocator.getByTestId('OperationListItem').filter({ hasText: pattern }).nth(nth - 1), path, `${nth}${nthPostfix(nth)} ${this.name.toLowerCase()} list item`)
    }
    throw Error('Check arguments. Operation should have method+path or type+method.')
  }

  getTagButton(tagName?: string): TagButton {
    if (!tagName) {
      return new TagButton(this.rootLocator.getByRole('button'))
    }
    return new TagButton(this.rootLocator.getByRole('button', { name: tagName }), tagName)
  }
}
