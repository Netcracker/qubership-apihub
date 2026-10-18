import { buildPackageWithDefaultConfig } from './helpers'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'

describe('Info', () => {
  // TODO add tag in channel, add tag in operation, remove tag from operation and so on
  describe('Tags', () => {
    const TAGS_INLINE_PACKAGE_ID = 'asyncapi/info/tags/inline'
    const TAGS_FROM_REF_PACKAGE_ID = 'asyncapi/info/tags/refs'
    const TAGS_MIXED_INLINE_AND_REF_PACKAGE_ID = 'asyncapi/info/tags/refs-and-inline'

    test('should extract tags from inline tag definitions', async () => {
      await runTagsTest(
        TAGS_INLINE_PACKAGE_ID,
        [
          {
            'name': 'simple_tag1',
            'description': 'Description for simple_tag1',
          },
          {
            'name': 'simple_tag2',
            'description': 'Description for simple_tag2',
          },
        ])
    })

    test('should extract tags when tags are defined via $ref', async () => {
      await runTagsTest(
        TAGS_FROM_REF_PACKAGE_ID,
        [
          {
            'name': 'ref_tag1',
            'description': 'Description for ref_tag1',
          },
          {
            'name': 'ref_tag2',
            'description': 'Description for ref_tag2',
          },
        ])
    })

    test('should extract tags from a mix of inline and $ref tag definitions', async () => {
      await runTagsTest(
        TAGS_MIXED_INLINE_AND_REF_PACKAGE_ID,
        [
          {
            'name': 'ref_tag1',
            'description': 'Description for ref_tag1',
          },
          {
            'name': 'simple_tag2',
            'description': 'Description for simple_tag2',
          },
        ])
    })

    async function runTagsTest(packageId: string, expectedTags: AsyncAPIV3.TagObject[]): Promise<void> {
      const result = await buildPackageWithDefaultConfig(packageId)

      const [document] = Array.from(result.documents.values())
      const { tags } = document.metadata
      expect(tags).toEqual(expectedTags)
    }
  })
  
  describe('External documentation', () => {
    const EXTERNAL_DOCS_INLINE_PACKAGE_ID = 'asyncapi/info/external-documentation/inline'
    const EXTERNAL_DOCS_FROM_REF_PACKAGE_ID = 'asyncapi/info/external-documentation/refs'

    test('should extract external documentation from an inline externalDocs object', async () => {
      await runExternalDocumentationTest(EXTERNAL_DOCS_INLINE_PACKAGE_ID, {
        'description': 'Simple',
        'url': 'https://example.com/docs',
      })
    })

    test('should extract external documentation when externalDocs is defined via $ref', async () => {
      await runExternalDocumentationTest(EXTERNAL_DOCS_FROM_REF_PACKAGE_ID, {
        'description': 'Ref',
        'url': 'https://example.com/docs',
      })
    })

    async function runExternalDocumentationTest(
      packageId: string,
      expectedExternalDocumentationObject: AsyncAPIV3.ExternalDocumentationObject,
    ): Promise<void> {
      const result = await buildPackageWithDefaultConfig(packageId)

      const [document] = Array.from(result.documents.values())
      const { externalDocs } = document.metadata
      expect(externalDocs).toEqual(expectedExternalDocumentationObject)
    }
  })
})
