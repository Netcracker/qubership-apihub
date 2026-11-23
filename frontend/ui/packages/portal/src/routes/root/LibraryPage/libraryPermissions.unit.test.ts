import {
  ACCESS_TOKEN_MANAGEMENT_PERMISSION,
  CREATE_AND_UPDATE_PACKAGE_PERMISSION,
  DELETE_PACKAGE_PERMISSION,
  DOCUMENT_SHAREABILITY_MANAGEMENT_PERMISSION,
  MANAGE_DEPRECATED_VERSION_PERMISSION,
  MANAGE_DRAFT_VERSION_PERMISSION,
  MANAGE_RELEASE_VERSION_PERMISSION,
  type PackagePermission,
  type PackagePermissions,
  READ_PERMISSION,
  USER_ACCESS_MANAGEMENT_PERMISSION,
} from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'

import type { MavenLibraryDto } from '@portal/entities/libraries'

import { toEffectiveLibraryPermissions } from './libraryPermissions'

const allPermissions: PackagePermission[] = [
  READ_PERMISSION,
  CREATE_AND_UPDATE_PACKAGE_PERMISSION,
  DELETE_PACKAGE_PERMISSION,
  MANAGE_DRAFT_VERSION_PERMISSION,
  MANAGE_RELEASE_VERSION_PERMISSION,
  MANAGE_DEPRECATED_VERSION_PERMISSION,
  USER_ACCESS_MANAGEMENT_PERMISSION,
  ACCESS_TOKEN_MANAGEMENT_PERMISSION,
  DOCUMENT_SHAREABILITY_MANAGEMENT_PERMISSION,
]

describe('toEffectiveLibraryPermissions', () => {
  it.each<[
    string,
    Pick<MavenLibraryDto, 'permissions' | 'parentPackageId'>,
    boolean,
    PackagePermissions | undefined,
    PackagePermission[],
  ]>([
    ['preserves explicit permissions for an administrator', { permissions: [READ_PERMISSION] }, true, undefined, [READ_PERMISSION]],
    ['preserves an explicit empty list over parent permissions', { permissions: [], parentPackageId: 'parent' }, false, allPermissions, []],
    ['preserves an explicit empty list for an administrator', { permissions: [] }, true, undefined, []],
    ['grants every permission to an administrator', {}, true, undefined, allPermissions],
    ['uses parent permissions', { parentPackageId: 'parent' }, false, [READ_PERMISSION], [READ_PERMISSION]],
    ['grants no permissions without a parent', {}, false, allPermissions, []],
    ['grants no permissions when the parent request fails or has no data', { parentPackageId: 'parent' }, false, undefined, []],
    ['grants no permissions when the parent has none', { parentPackageId: 'parent' }, false, [], []],
  ])('%s', (_, library, isSuperAdmin, parentPermissions, expected) => {
    const permissions = toEffectiveLibraryPermissions(library, isSuperAdmin, parentPermissions)

    expect(permissions).toEqual(expected)
    if (library.permissions !== undefined) {
      expect(permissions).toBe(library.permissions)
    }
  })
})
