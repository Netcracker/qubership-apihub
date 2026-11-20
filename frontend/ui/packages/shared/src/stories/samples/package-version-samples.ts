import type { PackageVersion } from '../../entities/versions'

export const packageVersion: PackageVersion = {
  createdAt: 'Fri Oct 06 2023',
  createdBy: {
    name: 'John Doe',
    type: 'user',
    id: 'JD_1234',
  },
  status: 'draft',
  previousVersion: '2023.1@3',
  versionLabels: ['apihub/x-api-kind: no-BWC'],
  key: '2023.1@3',
  latestRevision: true,
}
