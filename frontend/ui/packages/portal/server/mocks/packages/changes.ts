import type { VersionChangesDto } from './types'
import { PACKAGES } from './packages'
import { OPERATIONS } from './operations'
import { getChangesSummary } from './version-contents'

export const DEFAULT_CHANGES = {
  'previousVersion': '2024.1',
  'previousVersionPackageId': 'PSB.workspace001.package001',
  'changes': [
    {
      'operationId': 'get-v1-pets',
      'title': 'List Pets',
      'apiType': 'rest',
      'changeSummary': {
        'breaking': 0,
        'semiBreaking': 0,
        'deprecated': 0,
        'nonBreaking': 0,
        'annotation': 1,
        'unclassified': 0,
      },
      'jsonPath': null,
      'action': 'change',
      'severity': '',
      'packageRef': 'package-1@1.0.0',
      'previousVersionPackageRef': 'package-1@0.9.0',
      'path': '/v1/pets',
      'method': 'get',
    },
    {
      'operationId': 'get-v1-fruit',
      'title': 'List Fruit',
      'apiType': 'rest',
      'changeSummary': {
        'breaking': 1,
        'semiBreaking': 0,
        'deprecated': 0,
        'nonBreaking': 0,
        'annotation': 0,
        'unclassified': 0,
      },
      'jsonPath': null,
      'action': 'remove',
      'severity': '',
      'packageRef': 'package-2@1.0.0',
      'previousVersionPackageRef': 'package-2@0.9.0',
      'path': '/v1/fruit',
      'method': 'patch',
    },
    {
      'operationId': 'post-v1-cars',
      'title': 'List cars',
      'apiType': 'rest',
      'changeSummary': {
        'breaking': 0,
        'semiBreaking': 0,
        'deprecated': 1,
        'nonBreaking': 0,
        'annotation': 1,
        'unclassified': 0,
      },
      'jsonPath': null,
      'action': 'change',
      'severity': '',
      'packageRef': 'package-4@1.0.0',
      'previousVersionPackageRef': 'package-4@0.9.0',
      'path': '/v1/cars',
      'method': 'post',
    },
  ],
  'packages': {
    'package-1@1.0.0': {
      refId: 'package-1',
      version: '1.0.0',
      name: 'Package 1',
    },
    'package-2@1.0.0': {
      refId: 'package-2',
      version: '1.0.0',
      name: 'Package 2',
    },
    'package-4@1.0.0': {
      refId: 'package-4',
      version: '1.0.0',
      name: 'Package 4',
    },
  },
}

export const PACKAGE1_CHANGES: VersionChangesDto = {
  previousVersion: '2024.1',
  previousVersionPackageId: 'PSB.testPkg',
  operations: [
    {
      operationId: 'get-v1-pets',
      title: 'List Pets',
      changeSummary: {
        breaking: 0,
        semiBreaking: 0,
        deprecated: 1,
        nonBreaking: 0,
        annotation: 1,
        unclassified: 0,
      },
      packageRef: 'package-1@1.0.0',
      path: '/v1/pets',
      method: 'get',
      tags: ['List Pets'],
    },
    {
      operationId: 'get-v1-fruit',
      title: 'List Fruit',
      changeSummary: {
        breaking: 1,
        semiBreaking: 0,
        deprecated: 0,
        nonBreaking: 0,
        annotation: 0,
        unclassified: 0,
      },
      packageRef: 'package-2@1.0.0',
      path: '/v1/fruit',
      tags: ['List Fruit'],
      method: 'patch',
    },
    {
      title: 'Update',
      operationId: 'post-v1-update-pets',
      changeSummary: {
        breaking: 0,
        semiBreaking: 0,
        deprecated: 1,
        nonBreaking: 0,
        annotation: 1,
        unclassified: 0,
      },
      packageRef: 'package-4@1.0.0',
      path: '/v1/pets/update',
      tags: ['Update Pets'],
      method: 'post',
    },
  ],
  packages: {
    'package-1@1.0.0': {
      refId: 'package-1',
      version: '1.0.0',
      name: 'Package 1',
    },
    'package-2@1.0.0': {
      refId: 'package-2',
      version: '1.0.0',
      name: 'Package 2',
    },
    'package-4@1.0.0': {
      refId: 'package-4',
      version: '1.0.0',
      name: 'Package 4',
    },
  },
}

export function generateVersionChanges(packageId: string, version1: string, version2: string): VersionChangesDto {
  const packageObject = PACKAGES.packages.find(packageObject => packageObject.packageId === packageId) ?? PACKAGES.packages[0]
  const ref1 = `${packageId}@${version1}`
  const ref2 = `${packageId}@${version2}`
  return {
    previousVersion: version1,
    previousVersionPackageId: packageId,
    operations: OPERATIONS.operations.map(operation => ({
      ...operation,
      changeSummary: getChangesSummary(),
      packageRef: ref2,
      previousVersionPackageRef: ref1,
    })),
    packages: {
      [ref1]: {
        ...packageObject,
        refId: packageId,
        version: version1,
      },
      [ref2]: {
        ...packageObject,
        refId: packageId,
        version: version2,
      },
    },
  }
}
