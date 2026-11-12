import type { PackageReference } from '../../entities/version-references'
import { PACKAGE_KIND } from '../../entities/packages'
import { DRAFT_VERSION_STATUS } from '../../entities/version-status'

export const references: PackageReference[] = [
  {
    'kind': PACKAGE_KIND,
    'name': 'APIHUB backend',
    'version': '2023.1-3@1',
    'status': DRAFT_VERSION_STATUS,
    'parentPackages': [
      'Primary',
      'Secondary',
      'APIHUB',
    ],
    'key': 'QS.AH',
    'latestRevision': true,
  },
  {
    'kind': PACKAGE_KIND,
    'name': 'petstore',
    'version': '2023.1@1',
    'status': DRAFT_VERSION_STATUS,
    'parentPackages': [
      'Primary',
      'Secondary',
      'apps',
      'Petstore',
    ],
    'key': 'PRMR.SCDR.APPS.PTSTR',
    'latestRevision': false,
  },
  {
    'kind': PACKAGE_KIND,
    'name': 'petstore',
    'version': '2023.1@5',
    'status': DRAFT_VERSION_STATUS,
    'parentPackages': [
      'Primary',
      'Secondary',
      'apps',
      'Petstore',
    ],
    'key': 'PRMR.SCDR.APPS.PTSTR',
    'latestRevision': true,
  },
  {
    'kind': PACKAGE_KIND,
    'name': 'bookstore',
    'version': 'draft_1@1',
    'status': DRAFT_VERSION_STATUS,
    'parentPackages': [
      'Primary',
      'Secondary',
      'apps',
      'Bookstore',
    ],
    'key': 'PRMR.SCDR.APPS.BKSTR',
    'latestRevision': true,
    'hasErrors': true,
  },
  {
    'kind': PACKAGE_KIND,
    'name': 'My Package',
    'version': 'test_1@1',
    'status': DRAFT_VERSION_STATUS,
    'parentPackages': [
      'Personal sandboxes',
      'My Package',
    ],
    'key': 'PSB.MYPKG',
    'latestRevision': true,
    'changelogHasErrors': true,
  },
]
