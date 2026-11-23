import type { To } from 'react-router-dom'

import type { PackagePermissions } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'

import type { MavenLibraryDto } from '@portal/entities/libraries'
import type { ACCESS_TOKENS_PAGE, GENERAL_PAGE, USER_ACCESS_CONTROLS_PAGE, VERSIONS_PAGE } from '../../../../routes'

export type LibrarySettingsPageRoute =
  | typeof GENERAL_PAGE
  | typeof VERSIONS_PAGE
  | typeof ACCESS_TOKENS_PAGE
  | typeof USER_ACCESS_CONTROLS_PAGE

export type LibrarySettingsNavItemProps = Readonly<{
  label: string
  description: string
  value: LibrarySettingsPageRoute
  url: To
  permissions?: PackagePermissions
}>

export type LibrarySettingsTabProps = Readonly<{
  library: MavenLibraryDto
}>
