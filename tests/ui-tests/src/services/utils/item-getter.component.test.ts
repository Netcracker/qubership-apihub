import { test } from '@fixtures'
import { PortalPage } from '@portal/pages/PortalPage'
import { PortalTableRow } from '@portal/pages/PortalPage/PortalTableRow'
import { expect } from '@services/expect-decorator'
import { IMM_GR } from '@test-data/portal'
import { Group, Package } from '@test-data/props'
import type { ItemGetterConfig } from './item-getter'
import { createItemGetter } from './item-getter'

test.describe('Item Getter tests', { tag: '@external' }, () => {
  const GRP_CMPT_MAIN_R = new Group({
    name: 'Component',
    alias: 'GCOMP',
    parent: IMM_GR,
    description: 'Reusable. Component tests.',
  })

  const GRP_CMPT_ITEM_GETTER_R = new Group({
    name: 'Item Getter',
    alias: 'GRITGET',
    parent: GRP_CMPT_MAIN_R,
  })

  const genPackageParams = (count: number): Package[] => {
    return Array.from({ length: count }, (_, index) => {
      const num: number = index + 1
      return new Package({
        name: `package-${num}`,
        alias: `PKG-${num}`,
        parent: GRP_CMPT_ITEM_GETTER_R,
      })
    })
  }

  const packages = genPackageParams(4)

  test.beforeAll('Create test data', async ({ apihubTDM }) => {
    const allPackages = [
      GRP_CMPT_MAIN_R,
      GRP_CMPT_ITEM_GETTER_R,
      ...packages,
    ]

    await apihubTDM.createPackage(allPackages)
  })

  test('Check table rows', async ({ sysadminPage: page }) => {
    const portalPage = new PortalPage(page)

    const rulesetRowConfig: ItemGetterConfig<PortalTableRow> = {
      constructor: PortalTableRow,
      // eslint-disable-next-line ui-testing/no-browser-commands-in-tests
      rootLocator: page.getByTestId('Cell-name'),
      navigateToParent: true,
      componentTypes: {
        singular: 'package row',
        plural: 'package rows',
      },
    }

    const getRow = createItemGetter(rulesetRowConfig)

    await portalPage.gotoGroup(GRP_CMPT_ITEM_GETTER_R)

    await expect(getRow()).toHaveCount(4)
    await expect(getRow('package', undefined, { exact: false })).toHaveCount(4)
    await expect(getRow(1)).toBeVisible()
    await expect(getRow(1).nameCell).toBeVisible() // This assertion ensures that 'getRow()' returns a 'TableRow' object and not just the cell itself.
    await expect(getRow(2)).toBeVisible()
    await expect(getRow(3)).toBeVisible()
    await expect(getRow(4)).toBeVisible()
    await expect(getRow('package-1')).toBeVisible()
    await expect(getRow('package-1', 1, { exact: true })).toBeVisible()
    await expect(getRow(/^package-1/, 1, { exact: true })).toBeVisible()
    await expect(getRow(/^package-1/i, 1)).toBeVisible()
    await expect(getRow(/^package/i)).toHaveCount(4)
    await expect(getRow(/^package/i, undefined, { exact: true })).toHaveCount(4)
  })
})
