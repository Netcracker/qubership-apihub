import { trimPath } from '../src/utils/path'

const PATHS = [
  ['servers', 0, 'url'],
  ['paths', '/path2', 'put', 'responses', 200],
  ['components', 'schemas', 'UpgradeRequest', 'type'],
  ['components', 'responses', 200, 'content'],
  ['components', 'headers', 'content-range', 'description'],
  ['security', 0, 'oAuthSample'],
  ['externalDocs', 'description'],
]

const TRIMMED_PATHS = [
  ['servers', 0],
  ['paths', '/path2'],
  ['components', 'schemas', 'UpgradeRequest'],
  ['components', 'responses', 200],
  ['components', 'headers', 'content-range'],
  ['security', 0],
  ['externalDocs'],
]

describe('Path trim test', () => {
  test('Path trim test', async () => {
    PATHS.forEach((path, index) => {
      expect(trimPath(path)).toEqual(TRIMMED_PATHS[index])
    })
  })
})
