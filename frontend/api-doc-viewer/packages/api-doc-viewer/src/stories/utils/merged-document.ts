import { apiDiff, COMPARE_MODE_OPERATION, CompareResult, DIFF_META_KEY } from '@netcracker/qubership-apihub-api-diff';
import { NormalizeOptions, stringifyCyclicJso } from '@netcracker/qubership-apihub-api-unifier';

const SYNTHETIC_TITLE_FLAG = Symbol('synthetic-title');
const NORMALIZE_OPTIONS: NormalizeOptions = {
  validate: true,
  liftCombiners: true,
  syntheticTitleFlag: SYNTHETIC_TITLE_FLAG,
  unify: true,
  allowNotValidSyntheticChanges: true,
};

export const getMergedDocument = (before: object | undefined, after: object | undefined): unknown => {
  if (before && after) {
    return getCompareResult(before, after).merged
  }

  return null
}

export const getCompareResult = (
  before: object,
  after: object,
): CompareResult => {
  const beforeOperation = before
  const afterOperation = after

  // Used similar options like in builder
  const compareResult = apiDiff(beforeOperation, afterOperation, {
    ...NORMALIZE_OPTIONS,
    beforeSource: before,
    afterSource: after,
    mode: COMPARE_MODE_OPERATION,
    metaKey: DIFF_META_KEY
  })

  // To prevent circular reference error in Storybook
  if (isObject(compareResult.merged)) {
    compareResult.merged.toJSON = () => stringifyCyclicJso(compareResult.merged)
  }
  return compareResult
}

function isObject(maybeObject: unknown): maybeObject is Record<PropertyKey, unknown> {
  return maybeObject !== undefined && maybeObject !== null && typeof maybeObject === 'object';
}
