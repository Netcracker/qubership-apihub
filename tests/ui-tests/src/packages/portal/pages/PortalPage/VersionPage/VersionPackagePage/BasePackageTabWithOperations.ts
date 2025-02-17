import { Tab } from '@shared/components/base'
import { OperationsTabSidebar } from '@portal/components'
import { PackageTabToolbar } from './PackageTabToolbar'
import { OperationPreview } from './OperationsPackageTab/OperationPreview'
import type { Locator } from '@playwright/test'

export abstract class BasePackageTabWithOperations extends Tab {

  readonly toolbar = new PackageTabToolbar(this.rootLocator.page())
  readonly sidebar = new OperationsTabSidebar(this.rootLocator)
  readonly operationPreview = new OperationPreview(this.rootLocator.page())

  protected constructor(readonly rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName || '', componentType || '')
  }
}
