import type { RevisionsDto } from './types'
import { VERSION_2_6_2, VERSION_2_6_3 } from './version-contents'
import { DRAFT_VERSION_STATUS, RELEASE_VERSION_STATUS } from './version-statuses'

export const REVISIONS: RevisionsDto = {
  revisions: [
    {
      revision: '2',
      version: VERSION_2_6_2,
      notLatestRevision: true,
      status: RELEASE_VERSION_STATUS,
      createdBy: {
        id: 'JD_1234',
        name: 'John Doe',
        email: 'john.doe@example.com',
        avatarUrl: 'string',
      },
      createdAt: '2023-10-06T14:33:44.550622Z',
      revisionLabels: [
        'revision-label',
      ],
      publishMeta: {
        commitId: 'a5d45af7',
        repositoryUrl: 'https://git.example.com/APIHUB/apihub-registry',
        cloudName: 'my-cloud',
        cloudUrl: 'https://cloud.example.com',
        namespace: 'cloud-release2',
      },
    },
    {
      revision: '3',
      version: VERSION_2_6_3,
      status: DRAFT_VERSION_STATUS,
      createdBy: {
        id: 'JD_1234',
        name: 'John Doe',
        email: 'john.doe@example.com',
        avatarUrl: 'string',
      },
      createdAt: '2023-10-05T14:33:44.550622Z',
      revisionLabels: [
        'revision-label',
      ],
      publishMeta: {
        commitId: 'a5d45af7',
        repositoryUrl: 'https://git.example.com/APIHUB/apihub-registry',
        cloudName: 'my-cloud',
        cloudUrl: 'https://cloud.example.com',
        namespace: 'cloud-release2',
      },
    },
  ],
}
