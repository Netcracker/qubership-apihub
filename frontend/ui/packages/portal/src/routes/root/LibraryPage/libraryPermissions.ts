import type { PackagePermission } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import {
  VERSION_STATUS_MANAGE_PERMISSIONS,
  VERSION_STATUSES,
  type VersionStatus,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'

import type { MavenLibraryDto } from '@portal/entities/libraries'

// A library carries package permissions; the backend still checks every request
export const NO_VERSION_PERMISSION_HINT = 'You do not have permission to manage versions with this status'

// TODO(libraries-backend): GET /libraries/{libraryId} omits permissions, so all actions stay hidden.
// Wait for the caller's effective permissions from the service.
export function hasLibraryPermission(library: MavenLibraryDto, permission: PackagePermission): boolean {
  return !!library.permissions?.includes(permission)
}

// TODO(libraries-backend): The service checks only manage_draft_version for import and version deletion,
// even though imports release automatically. Keep this stricter status rule until it checks manage_release_version.
export function canManageLibraryVersion(library: MavenLibraryDto, status: VersionStatus): boolean {
  return hasLibraryPermission(library, VERSION_STATUS_MANAGE_PERMISSIONS[status])
}

// the statuses the user may give a version when publishing or editing it
export function getManageableVersionStatuses(library: MavenLibraryDto): VersionStatus[] {
  return VERSION_STATUSES.filter(status => canManageLibraryVersion(library, status))
}
