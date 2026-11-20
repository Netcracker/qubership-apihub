import type { Packages } from '../../entities/packages'
import { PACKAGE_KIND } from '../../entities/packages'
import { READ_PERMISSION } from '../../entities/package-permissions'

export const PACKAGE_OPTIONS: Packages = [
  {
    key: 'package-1',
    kind: PACKAGE_KIND,
    name: 'Package 1',
    alias: 'package1',
    parents: [],
    isFavorite: false,
    description: '',
    defaultReleaseVersion: '',
    restGroupingPrefix: '',
    permissions: [
      READ_PERMISSION,
    ],
  },
  {
    key: 'package-2',
    kind: PACKAGE_KIND,
    name: 'Package 2',
    alias: 'package2',
    parents: [],
    isFavorite: true,
    permissions: [
      READ_PERMISSION,
    ],
    defaultReleaseVersion: '',
    restGroupingPrefix: '',
    description: '',
  },
  {
    key: 'package-3',
    kind: PACKAGE_KIND,
    name: 'Package 3',
    alias: 'package3',
    isFavorite: false,
    description: '',
    restGroupingPrefix: '',
    permissions: [
      READ_PERMISSION,
    ],
  },
]
