import type { Locator } from '@playwright/test'
import type { Changes } from '@shared/entities'

export interface iAgentTableBwcStatusCell {
  getBwcStatusCell(serviceName: string, options?: { exact: boolean }): Locator
  getBwcStatusIcon(serviceName: string, options?: { exact: boolean }): Locator
}

export interface iAgentTablePublishStatusCell {
  getPublishStatusCell(serviceName: string, options?: { exact: boolean }): Locator
  getPublishStatusIcon(serviceName: string, options?: { exact: boolean }): Locator
}

export interface iAgentTableChangesCell {
  getChangesCell(serviceName: string, options?: { exact: boolean }): Locator
  getChangesTypography(serviceName: string, changesType: Changes, options?: { exact: boolean }): Locator
}
