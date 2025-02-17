import { type Locator, test as report } from '@playwright/test'
import type { PackageViewParams } from '@portal/entities'
import { BaseComponent } from './BaseComponent'
import { Link } from './Link'

export class Breadcrumbs extends BaseComponent {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'breadcrumbs')
  }

  async clickWorkspaceLink(workspace: { name: string }): Promise<void> {
    let link!: Link
    await report.step(`Click "${workspace.name}" link`, async () => {
      await report.step(`Create "${workspace.name}" link`, async () => {
        link = new Link(this.mainLocator.getByRole('link', { name: workspace.name }), workspace.name)
      })
      await link.click()
    })
  }

  async clickGroupLink(group: { name: string }): Promise<void> {
    let link!: Link
    await report.step(`Click "${group.name}" link`, async () => {
      await report.step(`Create "${group.name}" link`, async () => {
        link = new Link(this.mainLocator.getByRole('link', { name: group.name }), group.name)
      })
      await link.click()
    })
  }

  async clickPackageLink(pkg: PackageViewParams): Promise<void> {
    let link!: Link
    await report.step(`Click "${pkg.name}" link`, async () => {
      await report.step(`Create "${pkg.name}" link`, async () => {
        link = new Link(this.mainLocator.getByRole('link', { name: `${pkg.name}` }), `${pkg.name}`)
      })
      await link.click()
    })
  }

  async clickPackageVersionLink(props: {
    pkg: PackageViewParams
    version: string
  }): Promise<void> {
    let link!: Link
    await report.step(`Click "${props.pkg.name} / ${props.version}" link`, async () => {
      await report.step(`Create "${props.pkg.name} / ${props.version}" link`, async () => {
        link = new Link(this.mainLocator.getByRole('link', { name: `${props.pkg.name} / ${props.version}` }), `${props.pkg.name} / ${props.version}`)
      })
      await link.click()
    })
  }
}
