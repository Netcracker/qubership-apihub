import {
  breaking,
  breakingIf,
  breakingIfAfterTrue,
  nonBreaking,
  PARENT_JUMP,
  strictResolveValueFromContext,
  unclassified,
} from '../core'
import {
  getArrayValue,
  getKeyValue,
  isExist,
  isNotEmptyArray,
  isNumber,
  isString,
  isTypeAssignable,
  nonBreakingIf,
} from '../utils'
import type { ClassifyRule } from '../types'

export const typeClassifier: ClassifyRule = [
  breaking,//not tested
  breaking,//not tested
  ({ before, after }) => nonBreakingIf(isTypeAssignable(before.value, after.value, false)),
  breaking,//not tested
  breaking,//not tested
  ({ before, after }) => nonBreakingIf(isTypeAssignable(before.value, after.value, true)),
]

export const maxClassifier: ClassifyRule = [
  breaking,
  nonBreaking,
  ({ before, after }) => breakingIf(!isNumber(before.value) || !isNumber(after.value) || before.value > after.value),
]

export const minClassifier: ClassifyRule = [
  breaking,
  nonBreaking,
  ({ before, after }) => breakingIf(!isNumber(before.value) || !isNumber(after.value) || before.value < after.value),
]

export const minimumClassifier: ClassifyRule = [
  ({ before, after }) => {
    const beforeExclusiveMinimum = getKeyValue(before.parent, 'exclusiveMinimum')
    return breakingIf(!isNumber(beforeExclusiveMinimum) || !isNumber(after.value) || beforeExclusiveMinimum < after.value)
  },
  nonBreaking,
  ({ before, after }) => breakingIf(!isNumber(before.value) || !isNumber(after.value) || before.value < after.value),
]

export const maximumClassifier: ClassifyRule = [
  ({ before, after }) => {
    const beforeExclusiveMaximum = getKeyValue(before.parent, 'exclusiveMaximum')
    return breakingIf(!isNumber(beforeExclusiveMaximum) || !isNumber(after.value) || beforeExclusiveMaximum > after.value)
  },
  nonBreaking,
  ({ before, after }) => breakingIf(!isNumber(before.value) || !isNumber(after.value) || before.value > after.value),
]

export const exclusiveClassifier: ClassifyRule = [
  ({ after }) => (after.value === true ? breaking : unclassified),
  ({ before }) => (before.value === true ? nonBreaking : unclassified),
  breakingIfAfterTrue,
]

//todo think about replace multipleOf in inverse case
export const multipleOfClassifier: ClassifyRule = [
  breaking,
  nonBreaking,
  ({ before, after }) => breakingIfNotMultiple(before.value, after.value),
  nonBreaking,
  breaking,
  breaking,
]

export const requiredItemClassifyRule: ClassifyRule = [
  ({ after }) => (!isString(after.value) || isExist(strictResolveValueFromContext(after, PARENT_JUMP, PARENT_JUMP, 'properties', after.value, 'default')) ? nonBreaking : breaking),
  nonBreaking,
  ({ after }) => (!isString(after.value) || isExist(strictResolveValueFromContext(after, PARENT_JUMP, PARENT_JUMP, 'properties', after.value, 'default')) ? nonBreaking : breaking),
  nonBreaking,
  breaking,
  breaking,
]

//todo add logic about compliance with additionalProperties
export const propertyClassifyRule: ClassifyRule = [
  ({ after }) => (
    !isExist(getKeyValue(after.value, 'default')) &&
    getArrayValue((strictResolveValueFromContext(after, PARENT_JUMP, PARENT_JUMP, 'required')))?.includes(after.key) ? breaking : nonBreaking
  ),
  breaking,
  unclassified,
  nonBreaking,
  ({ before }) => (getArrayValue(strictResolveValueFromContext(before, PARENT_JUMP, PARENT_JUMP, 'required'))?.includes(before.key) ? breaking : nonBreaking),
  unclassified,
]

export const enumClassifyRule: ClassifyRule = [
  ({ before }) => (isNotEmptyArray(before.parent) ? nonBreaking : breaking),
  ({ after }) => (isNotEmptyArray(after.parent) ? breaking : nonBreaking),
  breaking,
]

export const nonInvertible = (rule: ClassifyRule): ClassifyRule => {
  return [...rule, ...rule] as ClassifyRule
}

export const breakingIfNotMultiple = (num1: unknown, num2: unknown) =>
  breakingIf(!isNumber(num1) || !isNumber(num2) || (num1 % num2 !== 0))
