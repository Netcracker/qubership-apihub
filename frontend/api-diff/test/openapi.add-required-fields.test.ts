//the issue: old spec on apiHub was incorrect, i.e. missed required fields
//fixing the old spec (adding required fields) should be a non-breaking change

import {
  apiDiff,
  breaking,
  CompareOptions,
} from '../src'
import { TEST_DIFF_FLAG, TEST_ORIGINS_FLAG } from './helper'

import addSecuritySchemeTypeBefore from './helper/resources/add-required-fields/openapi/add-securityscheme-type/before.json'
import addSecuritySchemeTypeAfter from './helper/resources/add-required-fields/openapi/add-securityscheme-type/after.json'

import addSecuritySchemeNameAndInBefore from './helper/resources/add-required-fields/openapi/add-securityscheme-name-and-in/before.json'
import addSecuritySchemeNameAndInAfter from './helper/resources/add-required-fields/openapi/add-securityscheme-name-and-in/after.json'

import addSecuritySchemeSchemeBefore from './helper/resources/add-required-fields/openapi/add-securityscheme-scheme/before.json'
import addSecuritySchemeSchemeAfter from './helper/resources/add-required-fields/openapi/add-securityscheme-scheme/after.json'

import addSecuritySchemeOpenIdConnectUrlBefore from './helper/resources/add-required-fields/openapi/add-securityscheme-openIdConnectUrl/before.json'
import addSecuritySchemeOpenIdConnectUrlAfter from './helper/resources/add-required-fields/openapi/add-securityscheme-openIdConnectUrl/after.json'

import addSecuritySchemeFlowsBefore from './helper/resources/add-required-fields/openapi/add-securityscheme-flows/before.json'
import addSecuritySchemeFlowsAfter from './helper/resources/add-required-fields/openapi/add-securityscheme-flows/after.json'

import addSecuritySchemeAuthorizationCodeFlowBefore from './helper/resources/add-required-fields/openapi/add-securityscheme-authorizationcode-flow-fields/before.json'
import addSecuritySchemeAuthorizationCodeFlowAfter from './helper/resources/add-required-fields/openapi/add-securityscheme-authorizationcode-flow-fields/after.json'

import addPathsBefore from './helper/resources/add-required-fields/openapi/add-paths/before.json'
import addPathsAfter from './helper/resources/add-required-fields/openapi/add-paths/after.json'

import addInfoBefore from './helper/resources/add-required-fields/openapi/add-info/before.json'
import addInfoAfter from './helper/resources/add-required-fields/openapi/add-info/after.json'

import addInfoFieldsBefore from './helper/resources/add-required-fields/openapi/add-info-fields/before.json'
import addInfoFieldsAfter from './helper/resources/add-required-fields/openapi/add-info-fields/after.json'

import addInfoLicenseNameBefore from './helper/resources/add-required-fields/openapi/add-info-license-name/before.json'
import addInfoLicenseNameAfter from './helper/resources/add-required-fields/openapi/add-info-license-name/after.json'

import addOperationResponsesBefore from './helper/resources/add-required-fields/openapi/add-responses/before.json'
import addOperationResponsesAfter from './helper/resources/add-required-fields/openapi/add-responses/after.json'

import addOperationResponseDescriptionBefore from './helper/resources/add-required-fields/openapi/add-response-description/before.json'
import addOperationResponseDescriptionAfter from './helper/resources/add-required-fields/openapi/add-response-description/after.json'

import addOperationRequestBodyContentBefore from './helper/resources/add-required-fields/openapi/add-requestbody-content/before.json'
import addOperationRequestBodyContentAfter from './helper/resources/add-required-fields/openapi/add-requestbody-content/after.json'

import addExternalDocsUrlBefore from './helper/resources/add-required-fields/openapi/add-externaldocs-url/before.json'
import addExternalDocsUrlAfter from './helper/resources/add-required-fields/openapi/add-externaldocs-url/after.json'

import addServersUrlBefore from './helper/resources/add-required-fields/openapi/add-servers-url/before.json'
import addServersUrlAfter from './helper/resources/add-required-fields/openapi/add-servers-url/after.json'

import addDiscriminatorPropertyNameBefore from './helper/resources/add-required-fields/openapi/add-discriminator-propertyname/before.json'
import addDiscriminatorPropertyNameAfter from './helper/resources/add-required-fields/openapi/add-discriminator-propertyname/after.json'

import addParametersNameBefore from './helper/resources/add-required-fields/openapi/add-parameters-name/before.json'
import addParametersNameAfter from './helper/resources/add-required-fields/openapi/add-parameters-name/after.json'

import addParametersInBefore from './helper/resources/add-required-fields/openapi/add-parameters-in/before.json'
import addParametersInAfter from './helper/resources/add-required-fields/openapi/add-parameters-in/after.json'

import addTagsNameBefore from './helper/resources/add-required-fields/openapi/add-tags-name/before.json'
import addTagsNameAfter from './helper/resources/add-required-fields/openapi/add-tags-name/after.json'

const TEST_COMPARE_OPTIONS: CompareOptions = {
  originsFlag: TEST_ORIGINS_FLAG,
  metaKey: TEST_DIFF_FLAG,
  validate: true,
  unify: true,
  liftCombiners: true,
  allowNotValidSyntheticChanges: true,
}

const notBreaking = (diffs: { type: unknown }[]) =>
  diffs.length > 0 && diffs.every(d => d.type !== breaking)

describe('openapi: adding previously missing required fields is not breaking', () => {

  describe('securitySchemes: ', () => {
    it('adding type to securitySchemes is not breaking', () => {
      const { diffs } = apiDiff(
        addSecuritySchemeTypeBefore,
        addSecuritySchemeTypeAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })

    it('adding name and in to securitySchemes is not breaking (only required for securitySchemes.type = apiKey)', () => {
      const { diffs } = apiDiff(
        addSecuritySchemeNameAndInBefore,
        addSecuritySchemeNameAndInAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })

    it('adding scheme to securitySchemes is not breaking (only required for securitySchemes.type = http)', () => {
      const { diffs } = apiDiff(
        addSecuritySchemeSchemeBefore,
        addSecuritySchemeSchemeAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })

    it('adding openIdConnectUrl to securitySchemes is not breaking (only required for securitySchemes.type = http)', () => {
      const { diffs } = apiDiff(
        addSecuritySchemeOpenIdConnectUrlBefore,
        addSecuritySchemeOpenIdConnectUrlAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })

    it('adding flows to securitySchemes is not breaking (only required for securitySchemes.type = oauth2)', () => {
      const { diffs } = apiDiff(
        addSecuritySchemeFlowsBefore,
        addSecuritySchemeFlowsAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })

    it('adding authorizationUrl, tokenUrl, scopes to an existing flow at securitySchemes is not breaking (only required for securitySchemes.type = oauth2)', () => {
      const { diffs } = apiDiff(
        addSecuritySchemeAuthorizationCodeFlowBefore,
        addSecuritySchemeAuthorizationCodeFlowAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })
  })

  describe('info: ', () => {
    it('adding info is not breaking', () => {
      const { diffs } = apiDiff(
        addInfoBefore,
        addInfoAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })

    it('adding info.title, info.version is not breaking', () => {
      const { diffs } = apiDiff(
        addInfoFieldsBefore,
        addInfoFieldsAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })

    it('adding info.license.name is not breaking', () => {
      const { diffs } = apiDiff(
        addInfoLicenseNameBefore,
        addInfoLicenseNameAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })
  })

  describe('paths and operation fields: ', () => {
    it('adding paths is not breaking', () => {
      const { diffs } = apiDiff(
        addPathsBefore,
        addPathsAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })

    it('adding responses to operation is not breaking', () => {
      const { diffs } = apiDiff(
        addOperationResponsesBefore,
        addOperationResponsesAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })

    it('adding description to response at operation is not breaking', () => {
      const { diffs } = apiDiff(
        addOperationResponseDescriptionBefore,
        addOperationResponseDescriptionAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })

    it('adding content to requestBody at operation is not breaking', () => {
      const { diffs } = apiDiff(
        addOperationRequestBodyContentBefore,
        addOperationRequestBodyContentAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })

    it('adding externalDocs to root, operation, tags, and schema is not breaking', () => {
      const { diffs } = apiDiff(
        addExternalDocsUrlBefore,
        addExternalDocsUrlAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })
  })

  describe('servers: ', () => {
    it('adding url to servers at root, path item, and operation level is not breaking', () => {
      const { diffs } = apiDiff(
        addServersUrlBefore,
        addServersUrlAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })
  })

  describe('schemas: ', () => {
    it('adding discriminator is not breaking', () => {
      const { diffs } = apiDiff(
        addDiscriminatorPropertyNameBefore,
        addDiscriminatorPropertyNameAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })
  })


  // These fields cannot be tested as "adding X is not breaking" due to engine limitations.
  // The tests below pin the actual current behaviour.
  describe('exceptional cases: ', () => {
    // Without `openapi`, the unifier classifies the spec as JSON Schema.
    // Comparing a JSON Schema spec against an OpenAPI spec throws and error because spec types are incompatible.
    it('adding openapi field throws error', () => {
      const before = { info: { title: 'Test', version: '1.0.0' }, paths: {} }
      const after = { openapi: '3.0.0', info: { title: 'Test', version: '1.0.0' }, paths: {} }
      expect(() => apiDiff(before, after, TEST_COMPARE_OPTIONS)).toThrow(/Specification cannot be different./)
    })

    // The unifier maps parameters by the compound key name+in.
    // A parameter that lacks name or in cannot be matched to its counterpart,
    // so the engine reports a remove (breaking) + add (breaking (if required: true) and non-breaking (if not required)) instead of a field-level add.
    it('adding name to a nameless parameter is currently reported as a remove (breaking) + add (non-breaking) (parameter is not required)', () => {
      const { diffs } = apiDiff(
        addParametersNameBefore,
        addParametersNameAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(diffs.some(d => d.type === breaking)).toBe(true)
    })

    it('adding in to a parameter without it is currently reported as a remove (breaking) + add (non-breaking) (parameter is not required)', () => {
      const { diffs } = apiDiff(
        addParametersInBefore,
        addParametersInAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(diffs.some(d => d.type === breaking)).toBe(true)
    })

    // When root.tags object doesn't have name field it's not linked to tag defined in the Operation Object instances
    // Therefore when name added to root.tags it's reported ass add(non-breaking)
    it('adding name to a nameless tag is currently reported as nonBreaking', () => {
      const { diffs } = apiDiff(
        addTagsNameBefore,
        addTagsNameAfter,
        TEST_COMPARE_OPTIONS,
      )
      expect(notBreaking(diffs)).toBe(true)
    })
  })
})
