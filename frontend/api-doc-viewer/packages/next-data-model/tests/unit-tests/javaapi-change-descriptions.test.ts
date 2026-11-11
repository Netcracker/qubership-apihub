import { describeJavaApiElementChanges, JAPICMP_TYPE_CODE_WORD } from '../../src/shared/javaapi/change-descriptions'

// change descriptions preserve code order and use the element subject supplied by the caller
describe('describeJavaApiElementChanges', () => {
  // codes from japicmp 0.26.1 `JApiCompatibilityChangeType`, the version java-task-consumer runs
  it.each([
    [JAPICMP_TYPE_CODE_WORD, 'class \'Type\'', 'CLASS_NOW_ABSTRACT', '[Changed] class \'Type\' is now abstract'],
    [
      JAPICMP_TYPE_CODE_WORD,
      'class \'Type\'',
      'CLASS_NOW_CHECKED_EXCEPTION',
      '[Changed] class \'Type\' is now a checked exception',
    ],
    [JAPICMP_TYPE_CODE_WORD, 'class \'Type\'', 'SUPERCLASS_REMOVED', '[Removed] superclass of class \'Type\''],
    [
      JAPICMP_TYPE_CODE_WORD,
      'interface \'Type\'',
      'INTERFACE_ADDED',
      '[Added] superinterface of interface \'Type\'',
    ],
    [
      'METHOD',
      'method \'clear()\'',
      'METHOD_NOW_THROWS_CHECKED_EXCEPTION',
      '[Changed] method \'clear()\' now throws a checked exception',
    ],
    [
      JAPICMP_TYPE_CODE_WORD,
      'class \'Type\'',
      'METHOD_ABSTRACT_ADDED_IN_SUPERCLASS',
      '[Added] abstract method in the superclass of class \'Type\'',
    ],
    [
      JAPICMP_TYPE_CODE_WORD,
      'class \'Type\'',
      'METHOD_ABSTRACT_ADDED_IN_IMPLEMENTED_INTERFACE',
      '[Added] abstract method in an implemented interface of class \'Type\'',
    ],
    ['FIELD', 'field \'count\'', 'FIELD_LESS_ACCESSIBLE', '[Changed] field \'count\': less accessible'],
  ])('describes %s subject %s with code %s as %s', (kindWord, subject, code, description) => {
    expect(describeJavaApiElementChanges('MODIFIED', [code], subject, kindWord)).toEqual([description])
  })

  it('describes change codes and deprecation in order', () => {
    expect(describeJavaApiElementChanges(
      'MODIFIED',
      ['METHOD_RETURN_TYPE_CHANGED', 'ANNOTATION_DEPRECATED_ADDED'],
      'method \'getValue()\'',
      'METHOD',
    )).toEqual([
      '[Changed] return type of method \'getValue()\'',
      '[Deprecated] method \'getValue()\'',
    ])
  })

  it.each([
    ['NEW', ['[Added] class \'Type\'']],
    ['UNCHANGED', []],
  ])('uses status %s when there are no change codes', (status, descriptions) => {
    expect(describeJavaApiElementChanges(status, [], 'class \'Type\'', JAPICMP_TYPE_CODE_WORD)).toEqual(descriptions)
  })
})
