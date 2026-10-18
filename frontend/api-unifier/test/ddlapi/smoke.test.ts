import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi/parser'

// Smoke test: the ddlapi parser is linked and importable from the '/parser' entry.
describe('ddlapi link smoke test', () => {
  it('buildFromDdl returns a Realm from the parser entry', async () => {
    const realm = await buildFromDdl('CREATE TABLE t(id int)')

    expect(realm).toMatchObject({
      ddlapi: '1.0.0',
      schemas: [
        {
          tables: [
            {
              kind: 'Table',
              name: 't',
              columns: [{ name: 'id' }],
            },
          ],
        },
      ],
    })
  })
})
