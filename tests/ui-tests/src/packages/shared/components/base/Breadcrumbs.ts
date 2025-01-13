/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
