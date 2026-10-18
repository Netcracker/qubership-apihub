import { type Page, test as report } from '@playwright/test'
import { Link } from '@shared/components/base'
import type { PackageViewParams } from '@portal/entities'
import { PortalTableRow } from './PortalTableRow'

export class PortalPageTable {

  private readonly locator = this.page.locator('tbody')

  constructor(private readonly page: Page) { }

  getRow(pkg?: PackageViewParams): PortalTableRow {
    if (pkg) {
      return new PortalTableRow(this.locator.getByRole('cell', {
        name: pkg.packageId,
        exact: true,
      }).locator('..'), pkg.name || pkg.packageId)
    }
    return new PortalTableRow(this.locator.locator('tr'))
  }

  /** @deprecated */
  async openPackage(packg: PackageViewParams): Promise<void> {
    await report.step(`Open "${packg.name || packg.packageId}" ${packg.kind || 'package'}`, async () => {
      let link: Link
      if (packg.kind === 'workspace') {
        link = new Link(this.locator.locator(`a[href="/portal/workspaces/${packg.packageId}"]`), packg.name || packg.packageId)
      } else {
        link = new Link(this.locator.locator(`a[href="/portal/packages/${packg.packageId}/"]`), packg.name || packg.packageId)
      }
      await link.click({ position: { x: 1, y: 1 } })
    })
  }

  async expandGroup(group: PackageViewParams): Promise<void> {
    await report.step(`Expand "${group.name || group.packageId}" group`, async () => {
      await this.getRow(group).nameCell.mainLocator.getByTestId('KeyboardArrowRightOutlinedIcon').click()
    })
  }

  async collapseGroup(group: PackageViewParams): Promise<void> {
    await report.step(`Collapse "${group.name || group.packageId}" group`, async () => {
      await this.getRow(group).nameCell.mainLocator.getByTestId('KeyboardArrowDownOutlinedIcon').click()
    })
  }
}
