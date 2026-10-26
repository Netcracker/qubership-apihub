import { requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import { getSnapshotPublicationInfo } from './snapshot-publication-info'

jest.mock('@netcracker/qubership-apihub-ui-shared/utils/requests', () => ({
  API_V2: '/api/v2',
  requestJson: jest.fn().mockResolvedValue({ services: [] }),
}))

describe('getSnapshotPublicationInfo', () => {
  test('encodes the plain snapshot version as a path component', async () => {
    await getSnapshotPublicationInfo('agent', 'namespace', 'workspace', 'test space+%20/#?', false, '/agents-backend')

    expect(requestJson).toHaveBeenCalledWith(
      '/agents/agent/namespaces/namespace/workspaces/workspace/snapshots/test%20space%2B%2520%2F%23%3F?promote=false',
      { method: 'get' },
      { basePath: '/agents-backend/api/v2', ignoreNotFound: true },
    )
  })
})
