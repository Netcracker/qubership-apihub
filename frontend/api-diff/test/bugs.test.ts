import { annotation, apiDiff, ClassifierType, CompareOptions, DiffAction, nonBreaking, unclassified } from '../src'
import offeringQualificationBefore from './helper/resources/api-v2-offeringqualification-qualification-post/before.json'
import offeringQualificationAfter from './helper/resources/api-v2-offeringqualification-qualification-post/after.json'
import readDefaultValueOfRequiredBefore from './helper/resources/read-default-value-of-required-field/before.json'
import readDefaultValueOfRequiredAfter from './helper/resources/read-default-value-of-required-field/after.json'

import infinityBefore from './helper/resources/ref-with-array-to-self/before.json'
import infinityAfter from './helper/resources/ref-with-array-to-self/after.json'

import identityCycledOneOfBefore from './helper/resources/identity-content-with-cycled-ref-oneOf/before.json'
import identityCycledOneOfAfter from './helper/resources/identity-content-with-cycled-ref-oneOf/after.json'

import identityCycledArrayBefore from './helper/resources/identity-content-with-cycled-ref-array/before.json'
import identityCycledArrayAfter from './helper/resources/identity-content-with-cycled-ref-array/after.json'

import identityContentRequestResponseBefore
  from './helper/resources/identity-content-with-cycled-request-and-response/before.json'
import identityContentRequestResponseAfter
  from './helper/resources/identity-content-with-cycled-request-and-response/after.json'

import diffInRequiredUnderCombinerBefore from './helper/resources/diff-in-required-under-combiner/before.json'
import diffInRequiredUnderCombinerAfter from './helper/resources/diff-in-required-under-combiner/after.json'

import changeToNothingClassificationBefore from './helper/resources/change-to-nothing-classification/before.json'
import changeToNothingClassificationAfter from './helper/resources/change-to-nothing-classification/after.json'

import spearedParamsBefore from './helper/resources/speared-parameters/before.json'
import spearedParamsAfter from './helper/resources/speared-parameters/after.json'

import { diffsMatcher } from './helper/matchers'
import { TEST_DIFF_FLAG, TEST_ORIGINS_FLAG } from './helper'
import { JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING } from '@netcracker/qubership-apihub-api-unifier'

const OPTIONS: CompareOptions = {
  // syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
  originsFlag: TEST_ORIGINS_FLAG,
  metaKey: TEST_DIFF_FLAG,
  validate: true,
  unify: true,
  liftCombiners: true,
  allowNotValidSyntheticChanges: true,
}
describe('Real Data', () => {

  it('Offering Qualification Operation', () => {
    const before: any = offeringQualificationBefore
    const after: any = offeringQualificationAfter
    const { diffs, merged } = apiDiff(before, after, OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [['components', 'schemas', 'QualificationItemResult', 'properties', 'offering']],
        scope: 'response',
        action: DiffAction.remove,
        type: nonBreaking,
      }),
      expect.objectContaining({
        afterDeclarationPaths: [['components', 'schemas', 'ProductOfferingQualified', 'allOf', 0, 'properties', 'offeringCategories']],
        scope: 'response',
        action: DiffAction.add,
        type: nonBreaking,
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [['components', 'schemas', 'QualificationItemResult']],
        action: DiffAction.remove,
        scope: 'components',
        type: unclassified,
      }),
    ]))
  })

  it('Cannot read properties of undefined (reading "default") - required field', () => {
    const before: any = readDefaultValueOfRequiredBefore
    const after: any = readDefaultValueOfRequiredAfter
    const { diffs, merged } = apiDiff(before, after, OPTIONS)
    expect(merged).not.toHaveProperty(['paths', '/api/v1/catalogManagement/productOffering', 'get', 'responses', 200, 'content', 'application/json', 'schema', 'required', 0])
    // unclassified because new required props does not exist in 'properties' section
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        afterDeclarationPaths: [['paths', '/api/v1/catalogManagement/productOffering', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'offeringGroup', 'required', 0]],
        action: DiffAction.add,
        afterValue: 'id',
        scope: 'response',
        type: nonBreaking,
      }),
      expect.objectContaining({
        afterDeclarationPaths: [['paths', '/api/v1/catalogManagement/productOffering', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'properties', 'offeringGroup', 'properties', 'id']],
        action: DiffAction.add,
        scope: 'response',
        type: nonBreaking,
      }),
    ]))
  })

  it('Ref with array to self - cycled path', () => {
    const before: any = infinityBefore
    const after: any = infinityAfter
    const { diffs } = apiDiff(before, after, OPTIONS)
    const responseContentPath = ['paths', '/api/v1/dictionaries/dictionary/item', 'get', 'responses', '200', 'content']
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [[...responseContentPath, '*/*']],
        afterDeclarationPaths: [[...responseContentPath, 'application/json']],
        action: DiffAction.rename,
        beforeKey: '*/*',
        afterKey: 'application/json',
        type: nonBreaking,
        scope: 'response',
      }),
      expect.objectContaining({
        afterDeclarationPaths: [['components', 'schemas', 'DictionaryItem', 'x-entity']],
        afterValue: 'DictionaryItem',
        action: DiffAction.add,
        type: unclassified,
        scope: 'response',
      }),
      expect.objectContaining({
        afterDeclarationPaths: [['components', 'schemas', 'DictionaryItem', 'x-entity']],
        afterValue: 'DictionaryItem',
        action: DiffAction.add,
        type: unclassified,
        scope: 'components',
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [['components', 'schemas', 'DictionaryItem1']],
        action: DiffAction.remove,
        type: unclassified,
        scope: 'components',
      }),
    ]))
  })

  it('Identity Content WIth Cycled Ref OneOf', () => {
    const before: any = identityCycledOneOfBefore
    const after: any = identityCycledOneOfAfter
    const { diffs } = apiDiff(before, after, OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        beforeDeclarationPaths: [['components', 'schemas', 'DocumentsGitBranch', 'oneOf', 0, 'properties', 'latestOrigin', 'description']],
        afterDeclarationPaths: [['components', 'schemas', 'DocumentsGitBranch', 'oneOf', 0, 'properties', 'latestOrigin', 'description']],
        scope: 'response',
        beforeValue: 'one',
        afterValue: 'another',
        action: DiffAction.replace,
        type: annotation,
      }),
      expect.objectContaining({
        beforeDeclarationPaths: [['components', 'schemas', 'DocumentsGitBranch', 'oneOf', 0, 'properties', 'latestOrigin', 'description']],
        afterDeclarationPaths: [['components', 'schemas', 'DocumentsGitBranch', 'oneOf', 0, 'properties', 'latestOrigin', 'description']],
        scope: 'components',
        beforeValue: 'one',
        afterValue: 'another',
        action: DiffAction.replace,
        type: annotation,
      }),
    ]))
  })

  it('Identity Content With Cycled Ref Array', () => {
    const before: any = identityCycledArrayBefore
    const after: any = identityCycledArrayAfter
    const { diffs } = apiDiff(before, after, OPTIONS)

    expect(diffs.length).toEqual(0)
  })

  it('Identity Content With Cycled Request And Response', () => {
    const before: any = identityContentRequestResponseBefore
    const after: any = identityContentRequestResponseAfter
    const { diffs } = apiDiff(before, after, OPTIONS)

    expect(diffs.length).toEqual(0)
  })

  it('diff in required under combiner', () => {
    const before: any = diffInRequiredUnderCombinerBefore
    const after: any = diffInRequiredUnderCombinerAfter
    const { diffs } = apiDiff(before, after, OPTIONS)
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.remove,
        beforeValue: 'one',
        beforeDeclarationPaths: [['components', 'schemas', 'main', 'oneOf', 0, 'required', 0]],
      }),
      expect.objectContaining({
        action: DiffAction.add,
        afterValue: 'another',
        afterDeclarationPaths: [['components', 'schemas', 'main', 'oneOf', 0, 'required', 0]],
      }),
    ]))
  })

  it('change type to nothing in response', () => {
    const before: any = changeToNothingClassificationBefore
    const after: any = changeToNothingClassificationAfter
    const { diffs } = apiDiff(before, after, OPTIONS)
    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: ClassifierType.breaking,
        beforeValue: 'string',
        afterValue: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
        beforeDeclarationPaths: [['paths', '/path', 'post', 'responses', '200', 'content', 'application/json', 'schema', 'type']],
        afterDeclarationPaths:
          expect.toIncludeSameMembers([
            ['paths', '/path', 'post', 'responses', '200', 'content', 'application/json', 'schema', 'allOf', 0, 'type'],
            ['paths', '/path', 'post', 'responses', '200', 'content', 'application/json', 'schema', 'allOf', 1, 'type'],
          ]),
      }),
    ]))
  })
  it('spered parameters', () => {
    const before: any = spearedParamsBefore
    const after: any = spearedParamsAfter
    const { diffs } = apiDiff(before, after, OPTIONS)
    expect(diffs).toBeEmpty()
  })
})
