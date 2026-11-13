import { deprecatedItemDescriptionMatcher, deprecatedItemsOf, Editor, LocalRegistry } from './helpers'
import { BUILD_TYPE, VERSION_STATUS } from '../src'

const packageRegistry = LocalRegistry.openPackage('deprecated-item-description')

describe('Description for deprecated items test', () => {
  test('description for schema object', async () => {
    const packageId = 'deprecated-schema'

    const editor = new Editor('deprecated-item-description', {
      packageId: packageId,
      version: 'v1',
      status: VERSION_STATUS.RELEASE,
      files: [{ fileId: 'deprecated-schema.yaml' }],
      buildType: BUILD_TYPE.BUILD,
    }, {}, packageRegistry)

    const result = await editor.run()

    const deprecatedItems = deprecatedItemsOf(result)

    expect(deprecatedItems[0]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in query parameter \'param1\''))
    expect(deprecatedItems[1]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.parameters.Parameter.schema\''))
    expect(deprecatedItems[2]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.schemas.CommonDeprecatedSchema.properties.petId\''))
    expect(deprecatedItems[3]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.responses.ResponseRef.content.application/json.schema\''))
    expect(deprecatedItems[4]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in header \'InlineHeader\' in response \'403\''))
    expect(deprecatedItems[5]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.headers.HeaderRef.schema\''))
    expect(deprecatedItems[6]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in response \'403\' (application/json)'))
    expect(deprecatedItems[7]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in request body (application/x-www-form-urlencoded)'))
    expect(deprecatedItems[8]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.schemas.MyDeprecate\''))
    expect(deprecatedItems[9]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.requestBodies.RequestBody.content.text/plain.schema\''))
  })
})
