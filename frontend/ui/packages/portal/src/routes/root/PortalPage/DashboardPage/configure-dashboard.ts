import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'
import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'

export const PACKAGES_CONFIGURE_DASHBOARD_TAB = 'packages'

export type ConfigureDashboardTabs = | typeof PACKAGES_CONFIGURE_DASHBOARD_TAB

export type ConfigureDashboardNavItemProps = Readonly<{
  id: ConfigureDashboardTabs
  title: string
}> & TestableProps

export type PackageReferenceWithStatus = {
  packageReference: PackageReference
  added: boolean
}
