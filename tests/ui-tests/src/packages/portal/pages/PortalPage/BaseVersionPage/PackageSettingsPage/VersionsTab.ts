import type { Page } from '@playwright/test'
import { Button, SearchBar } from '@shared/components/base'
import { BaseSettingsTab } from './BaseSettingsTab'
import { DeleteVersionDialog } from './VersionsTab/DeleteVersionDialog'
import { EditVersionDialog } from './VersionsTab/EditVersionDialog'
import { PackageSettingsVersionRow } from './VersionsTab/PackageSettingsVersionRow'
import { nthPostfix } from '@services/utils'

export class VersionsTab extends BaseSettingsTab {

  readonly allBtn = new Button(this.page.locator('button[value=All]'), 'All')
  readonly draftBtn = new Button(this.page.locator('button[value=draft]'), 'Draft')
  readonly releaseBtn = new Button(this.page.locator('button[value=release]'), 'Release')
  readonly archivedBtn = new Button(this.page.locator('button[value=archived]'), 'Archived')
  readonly searchbar = new SearchBar(this.page.getByTestId('SearchVersions'), 'Versions')
  readonly editVersionDialog = new EditVersionDialog(this.page)
  readonly deleteVersionDialog = new DeleteVersionDialog(this.page)

  constructor(page: Page) {
    super(page.getByTestId('TabButton-versions'), 'Versions')
  }

  getVersionRow(version?: string): PackageSettingsVersionRow
  getVersionRow(nth?: number): PackageSettingsVersionRow
  getVersionRow(version?: string, nth?: number): PackageSettingsVersionRow
  getVersionRow(versionOrNth?: string | number, nth?: number): PackageSettingsVersionRow {
    if (typeof versionOrNth === 'string' && !nth) {
      return new PackageSettingsVersionRow(this.page.getByRole('cell', {
        name: versionOrNth,
        exact: true,
      }).locator('..'), versionOrNth)
    }
    if (typeof versionOrNth === 'number') {
      return new PackageSettingsVersionRow(this.page.getByTestId('Cell-version').nth(versionOrNth - 1).locator('..'), '', `${versionOrNth}${nthPostfix(versionOrNth)} version row`)
    }
    if (!versionOrNth && !nth) {
      return new PackageSettingsVersionRow(this.page.getByTestId('Cell-version').locator('..'))
    }
    if (versionOrNth && nth) {
      return new PackageSettingsVersionRow(this.page.getByRole('cell', {
          name: versionOrNth,
          exact: true,
        }).locator('..').nth(nth - 1),
        versionOrNth,
        `${nth}${nthPostfix(nth)} version row`)
    }
    throw new Error('Check arguments')
  }
}
