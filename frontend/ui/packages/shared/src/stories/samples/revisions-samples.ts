import type { Revisions } from '../../entities/revisions'
import { DRAFT_VERSION_STATUS, RELEASE_VERSION_STATUS } from '../../entities/version-status'
import { USER } from '../../entities/principals'

export const revisions: Revisions = [
  {
    revision: 2,
    version: '2.6@2',
    latestRevision: false,
    status: RELEASE_VERSION_STATUS,
    createdBy: {
      type: USER,
      id: 'JD_1234',
      name: 'John Doe',
      email: 'john.doe@example.com',
      avatarUrl: 'string',
    },
    createdAt: '2023-10-06T14:33:44.550622Z',
    revisionLabels: [
      'my-cloud-label',
    ],
    publishMeta: {
      commitKey: 'a5d45af7',
      repositoryUrl: 'https://git.example.com/APIHUB/apihub-registry',
      cloudName: 'my-cloud',
      cloudUrl: 'https://cloud.example.com',
      namespace: 'my-cloud-release2',
    },
  },
  {
    revision: 3,
    version: '2.6@3',
    latestRevision: true,
    status: DRAFT_VERSION_STATUS,
    createdBy: {
      type: USER,
      id: 'JD_1234',
      name: 'John Doe',
      email: 'john.doe@example.com',
      avatarUrl: 'string',
    },
    createdAt: '2023-10-05T14:33:44.550622Z',
    revisionLabels: [
      'my-cloud-label',
    ],
    publishMeta: {
      commitKey: 'a5d45af7',
      repositoryUrl: 'https://git.example.com/APIHUB/apihub-registry',
      cloudName: 'my-cloud',
      cloudUrl: 'https://cloud.example.com',
      namespace: 'my-cloud-namespace',
    },
  },
]
