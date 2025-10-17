import { aggregateDiffsWithRollup, apiDiff, COMPARE_MODE_DEFAULT, CompareResult } from '@netcracker/qubership-apihub-api-diff';
import { denormalize, normalize, NormalizeOptions, RefErrorType, stringifyCyclicJso } from '@netcracker/qubership-apihub-api-unifier';
import { safeStringify } from '@stoplight/json';
import { aggregatedDiffMetaKey, diffMetaKey } from 'diff-block';

const SYNTHETIC_TITLE_FLAG = Symbol('synthetic-title');
const NORMALIZE_OPTIONS: NormalizeOptions = {
  validate: true,
  liftCombiners: true,
  syntheticTitleFlag: SYNTHETIC_TITLE_FLAG,
  unify: true,
  allowNotValidSyntheticChanges: true,
};

export const getMergedDocument = (before: object | undefined, after: object | undefined): unknown => {
  if (!before && after) {
    return normalizeOpenApiDocument(removeComponents(after), after)
  }

  if (before && !after) {
    return normalizeOpenApiDocument(removeComponents(before), before)
  }

  if (before && after) {
    return getCompareResult(before, after).merged
  }

  return null
}

export const getCompareResult = (
  before: object,
  after: object,
): CompareResult => {
  const beforeOperation = removeComponents(before)
  const afterOperation = removeComponents(after)

  // Used similar options like in builder
  const compareResult = apiDiff(beforeOperation, afterOperation, {
    ...NORMALIZE_OPTIONS,
    beforeSource: before,
    afterSource: after,
    mode: COMPARE_MODE_DEFAULT, // we do not really have guarantee that we have specs with single operation as an input, hence could not use COMPARE_MODE_SINGLE
    metaKey: diffMetaKey,
    onRefResolveError: (message: string, path: PropertyKey[], ref: string, errorType: RefErrorType) => {
      console.debug([
        '[ASV] [Ref Resolve Error]',
        `Message: ${message}`,
        `JSON path: ${path}`,
        `Ref: ${ref}`,
        `Error type: ${errorType}`,
      ].join('\n'));
    },
    onMergeError: (message: string, path: PropertyKey[], values: any[]) => {
      console.debug([
        '[ASV] [Merge Error]',
        `Message: ${message}`,
        `JSON path: ${path}`,
        `Values: ${safeStringify(values)}`
      ].join('\n'));
    },
    onUnifyError: (message: string, path: PropertyKey[], value: any, cause: unknown) => {
      console.debug([
        '[ASV] [Unify Error]',
        `Message: ${message}`,
        `JSON path: ${path}`,
        `Values: ${safeStringify(value)}`,
        `Cause: ${cause}`,
      ].join('\n'));
    },
    onValidateError: (message: string, path: PropertyKey[], value: any, cause: unknown) => {
      console.debug([
        '[ASV] [Validate Error]',
        `Message: ${message}`,
        `JSON path: ${path}`,
        `Values: ${safeStringify(value)}`,
        `Cause: ${cause}`,
      ].join('\n'));
    },
  });

  aggregateDiffsWithRollup(compareResult.merged, diffMetaKey, aggregatedDiffMetaKey)

  // to avoid circular serializing in storybook
  if (isObject(compareResult.merged)) {
    compareResult.merged.toJSON = () => stringifyCyclicJso(compareResult.merged)
  }
  return compareResult
}

export function removeComponents(source: object | undefined): unknown {
  if (source && 'components' in source) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // @ts-ignore
    const { components, ...rest } = source;
    if (isObject(components)) {
      if ('securitySchemes' in components) {
        return {
          ...rest,
          components: {
            securitySchemes: components.securitySchemes,
          },
        };
      }
    }
    return rest;
  }

  return source;
}

export function getCopyWithEmptyPaths(document: object): object {
  const { paths, ...rest } = document as any
  rest.paths = {}
  return rest
}

// TODO: Think about generic function or add document type checking
export function normalizeOpenApiDocument(operation: unknown, source: unknown): unknown {
  const normalizedSource = normalize(operation, {
    source: source,
    ...NORMALIZE_OPTIONS,
  });
  const mergedSource = denormalize(normalizedSource, NORMALIZE_OPTIONS)
  if (isObject(mergedSource)) {
    mergedSource.toJSON = () => stringifyCyclicJso(mergedSource)
  }
  return mergedSource;
}

function isObject(maybeObject: unknown): maybeObject is Record<PropertyKey, unknown> {
  return maybeObject !== undefined && maybeObject !== null && typeof maybeObject === 'object';
}
