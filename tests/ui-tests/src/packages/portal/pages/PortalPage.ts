import { type Page } from '@playwright/test'
import type {
  OperationViewParams,
  PackageViewParams,
  PackageViewSettingsTabs,
  VersionViewParams,
  VersionViewTabs,
} from '@portal/entities'
import { MainPage } from '@shared/pages'
import { GlobalSearchPanel } from './PortalPage/GlobalSearchPanel'
import { OperationPage } from './PortalPage/OperationPage'
import { PortalCreatePackageDialog } from './PortalPage/PortalCreatePackageDialog'
import { PortalPageSidebar } from './PortalPage/PortalPageSidebar'
import { PortalPageTable } from './PortalPage/PortalPageTable'
import { PortalPageToolbar } from './PortalPage/PortalPageToolbar'
import { VersionDashboardPage } from './PortalPage/VersionPage/VersionDashboardPage'
import { VersionPackagePage } from './PortalPage/VersionPage/VersionPackagePage'
import type { GotoOptions, OperationsApiType } from '@shared/entities'

export class PortalPage extends MainPage {

  readonly sidebar = new PortalPageSidebar(this.page)
  readonly toolbar = new PortalPageToolbar(this.page)
  readonly table = new PortalPageTable(this.page)
  readonly operationPage = new OperationPage(this.page)
  readonly globalSearchPanel = new GlobalSearchPanel(this.page)
  readonly versionPackagePage = new VersionPackagePage(this.page)
  readonly versionDashboardPage = new VersionDashboardPage(this.page)
  readonly createPackageDialog = new PortalCreatePackageDialog(this.page)

  constructor(protected readonly page: Page) {
    super(page)
  }

  url(): string {
    return this.page.url()
  }

  async goto(url?: string, options?: GotoOptions): Promise<void> {
    if (url) {
      await super.goto(url, options)
    } else {
      await this.navigationStep('Go to the "Portal" page', '/portal')
    }
  }

  async gotoWorkspace(workspace: PackageViewParams, tab?: PackageViewSettingsTabs): Promise<void> {
    await this.resolvePackageRoute(workspace, tab)
  }

  async gotoGroup(group: PackageViewParams, tab?: PackageViewSettingsTabs): Promise<void> {
    await this.resolvePackageRoute(group, tab)
  }

  async gotoPackage(pkg: PackageViewParams, tab?: PackageViewSettingsTabs): Promise<void> {
    await this.resolvePackageRoute(pkg, tab)
  }

  async gotoDashboard(dashboard: PackageViewParams, tab?: PackageViewSettingsTabs): Promise<void> {
    await this.resolvePackageRoute(dashboard, tab)
  }

  async gotoVersion({ pkg, version }: VersionViewParams, tab?: VersionViewTabs): Promise<void> {
    let stepTitle = `Open "${pkg.name || pkg.packageId} / ${version}" version`
    let path = `/portal/packages/${pkg.packageId}/${version}`
    if (tab) {
      stepTitle += ` on the "${tab}" tab`
      path += `/${tab}`
    }
    await this.navigationStep(stepTitle, path)
  }

  async gotoVersionEditing({ pkg, version }: VersionViewParams): Promise<void> {
    const stepTitle = `Open "${pkg.name || pkg.packageId} / ${version}" version editing`
    const path = `/portal/packages/${pkg.packageId}/${version}/edit`
    await this.navigationStep(stepTitle, path)
  }

  async gotoDocument({
    pkg,
    version,
  }: VersionViewParams, fileSlug: string, preview?: boolean): Promise<void> {
    let stepTitle = `Open "${fileSlug}" document from "${pkg.name || pkg.packageId} / ${version}" version`
    let path = `/portal/packages/${pkg.packageId}/${version}/documents/${fileSlug}`
    if (preview) {
      stepTitle += ' in preview mode'
      path += '/preview'
    }
    await this.navigationStep(stepTitle, path)
  }

  async gotoOperation(
    { pkg, version }: VersionViewParams,
    { operationId, apiType }: OperationViewParams,
  ): Promise<void> {
    const stepTitle = `Open "${operationId}" operation from "${pkg.name || pkg.packageId} / ${version}" version`
    const path = `/portal/packages/${pkg.packageId}/${version}/operations/${apiType}/${operationId}`
    await this.navigationStep(stepTitle, path)
  }

  async gotoComparisonPackages(
    currentPackage: PackageViewParams,
    currentVersion: string,
    previousVersion: string,
    previousPackage?: PackageViewParams,
    apiType?: OperationsApiType | 'all',
  ): Promise<void> {
    await this.resolveComparisonRoute(
      currentPackage,
      currentVersion,
      previousVersion,
      previousPackage,
      undefined,
      undefined,
      undefined,
      apiType,
    )
  }

  async gotoComparisonDashboards(
    currentDashboard: PackageViewParams,
    currentVersion: string,
    previousVersion: string,
    previousDashboard?: PackageViewParams,
    refPackage?: PackageViewParams,
    apiType?: OperationsApiType | 'all',
  ): Promise<void> {
    await this.resolveComparisonRoute(
      currentDashboard,
      currentVersion,
      previousVersion,
      previousDashboard,
      refPackage,
      undefined,
      undefined,
      apiType,
    )
  }

  async gotoComparisonOperationInPackages(
    currentPackage: PackageViewParams,
    currentVersion: string,
    previousVersion: string,
    operation: OperationViewParams,
    previousPackage?: PackageViewParams,
  ): Promise<void> {
    await this.resolveComparisonRoute(
      currentPackage,
      currentVersion,
      previousVersion,
      previousPackage,
      undefined,
      operation,
    )
  }

  async gotoComparisonOperationsInPackage(
    pkg: PackageViewParams,
    version: string,
    currentOperation: OperationViewParams,
    previousOperation?: OperationViewParams,
  ): Promise<void> {
    await this.resolveComparisonRoute(
      pkg,
      version,
      undefined,
      undefined,
      undefined,
      currentOperation,
      previousOperation,
    )
  }

  async gotoComparisonOperationInDashboards(
    currentDashboard: PackageViewParams,
    currentVersion: string,
    previousVersion: string,
    refPackage: PackageViewParams,
    operation: OperationViewParams,
    previousDashboard?: PackageViewParams,
  ): Promise<void> {
    await this.resolveComparisonRoute(
      currentDashboard,
      currentVersion,
      previousVersion,
      previousDashboard,
      refPackage,
      operation,
    )
  }

  async gotoComparisonOperationsInDashboard(
    dashboard: PackageViewParams,
    version: string,
    refPackage: PackageViewParams,
    currentOperation: OperationViewParams,
    previousOperation?: OperationViewParams,
  ): Promise<void> {
    await this.resolveComparisonRoute(
      dashboard,
      version,
      undefined,
      undefined,
      refPackage,
      currentOperation,
      previousOperation,
    )
  }

  private async resolvePackageRoute({
    packageId,
    name,
    kind,
  }: PackageViewParams, tab?: PackageViewSettingsTabs): Promise<void> {
    let stepTitle = `Open "${name || packageId}" ${kind || 'package'}`
    let path = kind === 'dashboard' ? `/portal/packages/${packageId}` : `/portal/${kind || 'package'}s/${packageId}`
    if (tab) {
      stepTitle += ` on the "${tab}" settings tab`
      path = `/portal/packages/${packageId}/@/settings/${tab}`
    }
    await this.navigationStep(stepTitle, path)
  }

  private async resolveComparisonRoute(
    currentPackage: PackageViewParams,
    currentVersion: string,
    previousVersion?: string,
    previousPackage?: PackageViewParams,
    refPackage?: PackageViewParams,
    currentOperation?: OperationViewParams,
    previousOperation?: OperationViewParams,
    apiType?: OperationsApiType | 'all',
  ): Promise<void> {
    const currentPackageTitle = currentPackage.name || currentPackage.packageId
    const previousVersionOption = previousVersion ? `version=${previousVersion}` : ''
    const previousPackageTitle = previousPackage ? previousPackage.name || previousPackage.packageId : currentPackageTitle
    const previousPackageOption = previousPackage ? `&package=${previousPackage.packageId}` : ''
    const refPackageTitle = refPackage ? `"${refPackage.name || refPackage.packageId}" in ` : ''
    const refPackageOption = refPackage ? `&ref=${refPackage.packageId}` : ''
    const currentOperationTitle = currentOperation ? `"${currentOperation.operationId}" in ` : ''
    const currentOperationOption = currentOperation ? `/${currentOperation.apiType}/${currentOperation.operationId}` : ''
    const previousOperationTitle = previousOperation ? `"${previousOperation.operationId}" vs ` : ''
    const previousOperationOption = previousOperation ? `operation=${previousOperation.operationId}` : ''
    const apiTypeOption = apiType ? `&apiType=${apiType}` : ''
    const stepTitle = `Open ${previousOperationTitle}${currentOperationTitle}${refPackageTitle}"${previousPackageTitle}/${previousVersion}" vs "${currentPackageTitle}/${currentVersion}" comparison`
    const path = `/portal/packages/${currentPackage.packageId}/${currentVersion}/compare${currentOperationOption}?${previousOperationOption}${previousVersionOption}${previousPackageOption}${refPackageOption}${apiTypeOption}`
    await this.navigationStep(stepTitle, path)
  }
}
