import { ANY_REST_SPEC, contentEditor, Editor, operationOf } from './helpers'

describe('Config validation', () => {
  describe('Config output', () => {
    test('Openapi metadata: title and tags', async () => {
      const tags = ['tag1', 'tag2']
      const title = 'Title for /pets and method get'

      const editor = await Editor.openProject('config')
      await editor.run({version: 'v1'})

      await editor.updateJsonFile('openapi.json', (data) => {
        data.paths['/pets'].get.tags = tags
        data.paths['/pets'].get.summary = title
        return data
      })

      const result = await editor.update(editor.config, 'openapi.json')

      expect(operationOf(result, 'api-pets-get').tags.join()).toEqual(tags.join())

      expect(Array.from(result.operations.values()).map(({ metadata }) => metadata)).toEqual(
        expect.toIncludeSameMembers([
          expect.objectContaining({ path: '/api/pets', originalPath: '/api/pets', method: 'get' }),
          expect.objectContaining({ path: '/api/pets', originalPath: '/api/pets', method: 'post' }),
          expect.objectContaining({ path: '/api/pets/*', originalPath: '/api/pets/{id}', method: 'delete' }),
        ]),
      )
    })
  })

  describe('Config input', () => {
    test('no set packageId field', async () => {
      const editor = contentEditor({ packageId: 'config/no-package-id', version: 'v100' }, { 'rest.json': ANY_REST_SPEC })
      await expect(
        editor.run({packageId: undefined, version: 'v3'}),
      ).rejects.toThrow('builder config: packageId required')

    })

    test('no set version field', async () => {
      const editor = contentEditor({ packageId: 'config/no-version', version: 'v100' }, { 'rest.json': ANY_REST_SPEC })
      await expect(
        editor.run({version: undefined}),
      ).rejects.toThrow('builder config: version required')
    })

    test('fileId is empty', async () => {
      // the editor refuses a listed id it holds no content for; the build skips the empty id, so this is never read
      const editor = contentEditor({ packageId: 'config/empty-file-id', version: 'v100' }, { '': 'unread' })
      const result = await editor.run({version: 'v3', files: [{fileId: '', publish: true, labels: []}]})

      expect(result.documents.size).toBe(0)
    })
  })
})
