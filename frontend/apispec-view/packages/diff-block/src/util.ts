import {
  ActionType,
  annotation,
  breaking,
  deprecated,
  Diff,
  DiffAdd,
  DiffMetaRecord,
  DiffRemove,
  DiffRename,
  DiffReplace,
  DiffType,
  isDiffAdd,
  isDiffRemove,
  isDiffRename,
  isDiffReplace,
  nonBreaking,
  risky,
  unclassified,
} from '@netcracker/qubership-apihub-api-diff'
import { clone, mapValues, values } from 'lodash';
import { isObject } from "@stoplight/diff-elements-core/utils/guards";

export function isDiff(diffRecordItem?: DiffMetaRecord | Diff): diffRecordItem is Diff {
  const maybeDiff = diffRecordItem as Diff
  if (!maybeDiff) {
    return false
  }
  return (
    isDiffAdd(maybeDiff) ||
    isDiffRemove(maybeDiff) ||
    isDiffReplace(maybeDiff) ||
    isDiffRename(maybeDiff)
  )
}

export function isDiffMetaRecord(diffRecordItem?: DiffMetaRecord | Diff): diffRecordItem is DiffMetaRecord {
  if (!diffRecordItem) {
    return false
  }
  if (typeof diffRecordItem !== 'object') {
    return false
  }
  const maybeDiffs = Object.values(diffRecordItem)
  return maybeDiffs.every(isDiff)
}

export const combineDiffType = (a: DiffType, b: DiffType): DiffType => {
  if (a === 'breaking' || b === 'breaking') {
    return 'breaking';
  }
  if (a === 'risky' || b === 'risky') {
    return 'risky';
  }
  if (a === 'deprecated' || b === 'deprecated') {
    return 'deprecated';
  }
  if (a === 'non-breaking' || b === 'non-breaking') {
    return 'non-breaking';
  }
  if (a === 'annotation' || b === 'annotation') {
    return 'annotation';
  }
  if (a === 'unclassified' || b === 'unclassified') {
    return 'unclassified';
  }
  return 'unclassified'; // unreachable
};

export const combineActionType = (a: ActionType, b: ActionType) => {
  if (a === 'add' && b === 'add') {
    return 'add';
  }
  if (a === 'remove' && b === 'remove') {
    return 'remove';
  }
  return 'replace';
};

type DiffPaths = {
  beforeDeclarationPaths: PropertyKey[][]
  afterDeclarationPaths: PropertyKey[][]
}

export const combineDiffMetas = (diffs: Partial<Record<string, Diff | DiffMetaRecord>>): Diff | undefined => {
  const diffMetas = values(diffs);
  let result: Diff | undefined = undefined;
  const diffPaths: Partial<Record<DiffType, DiffPaths>> = {}
  for (let meta of diffMetas) {
    if (!isObject(meta)) {
      continue;
    }

    if (isDiffMetaRecord(meta)) {
      meta = combineDiffMetas(meta);
    }

    if (!meta) {
      continue;
    }

    if (meta.type === 'deprecated') {
      // overriding rules for "deprecated"
      result ??= {
        type: meta.type,
        action: 'replace',
        beforeValue: meta.action === 'add'
          ? false
          : meta.action === 'remove'
            ? true
            : undefined,
      } as DiffReplace;
    } else {
      // common rules
      if (isDiffAdd(meta) || isDiffRemove(meta)) {
        result ??= {
          type: meta.type,
          action: meta.action,
        } as DiffAdd | DiffRemove;
      }
      if (isDiffReplace(meta)) {
        result ??= {
          type: meta.type,
          action: meta.action,
          beforeValue: meta.beforeValue,
          afterValue: meta.afterValue,
        } as DiffReplace
      }
      if (isDiffRename(meta)) {
        result ??= {
          type: meta.type,
          action: meta.action,
          beforeKey: meta.beforeKey,
          afterKey: meta.afterKey,
        } as DiffRename
      }
    }

    if (result) {
      diffPaths[meta.type] ??= {
        beforeDeclarationPaths: [],
        afterDeclarationPaths: []
      }
      if (hasBeforeDeclarationPaths(meta)) {
        diffPaths[meta.type]!.beforeDeclarationPaths.push(...meta.beforeDeclarationPaths)
      }
      if (hasAfterDeclarationPaths(meta)) {
        diffPaths[meta.type]!.afterDeclarationPaths.push(...meta.afterDeclarationPaths)
      }
      result!.type = combineDiffType(result!.type, meta.type);
      result!.action = combineActionType(result!.action, meta.action);
    }
  }
  if (result && result.type) {
    diffPaths[result.type] ??= {
      beforeDeclarationPaths: [],
      afterDeclarationPaths: []
    }
    if (hasBeforeDeclarationPaths(result)) {
      result!.beforeDeclarationPaths = diffPaths[result.type]!.beforeDeclarationPaths
    }
    if (hasAfterDeclarationPaths(result)) {
      result!.afterDeclarationPaths = diffPaths[result.type]!.afterDeclarationPaths
    }
  }
  return result;
};

const extractAmountOfDiffsMemo = new WeakMap();
const visitedSet = new Set();

export const extractAmountOfDiffs = (value: any, diffMetaKey: symbol): { [key in DiffType]: number } => {
  const initial = {
    [breaking]: 0,
    [nonBreaking]: 0,
    [deprecated]: 0,
    [unclassified]: 0,
    [annotation]: 0,
    [risky]: 0,
  };

  const addMetaToInitial = (meta: Diff | DiffMetaRecord) => {
    if (!meta) {
      return;
    }

    if (isDiffMetaRecord(meta)) {
      const combinedMeta = combineDiffMetas(meta)
      // @ts-ignore
      addMetaToInitial(combinedMeta);
    } else {
      initial[meta.type]++;
    }
  };

  if (!value || typeof value !== 'object') {
    return initial;
  }

  if (extractAmountOfDiffsMemo.has(value)) {
    return extractAmountOfDiffsMemo.get(value);
  }

  if (value && typeof value === 'object' && visitedSet.has(value)) {
    return initial;
  }

  if (value && typeof value === 'object') {
    visitedSet.add(value);
  }

  if (value?.[diffMetaKey]) {
    values(value[diffMetaKey]).forEach(addMetaToInitial);
  }

  const result = values(value)
    .map(v => extractAmountOfDiffs(v, diffMetaKey))
    .reduce((acc, next) => mapValues(acc, (value, key) => value + next[key]), initial);

  extractAmountOfDiffsMemo.set(value, result);
  return result;
};

export const applyReplacedFromMeta = <T>(value: T, meta: Diff | DiffMetaRecord | undefined): T => {
  let patchedValue = value;
  if (meta) {
    if (isDiffMetaRecord(meta)) {
      for (let index in meta) {
        patchedValue = clone(patchedValue);
        const metaForIndex = meta[index];
        // @ts-ignore
        patchedValue[index] = applyReplacedFromMeta(patchedValue[index], metaForIndex);
      }
    } else if (isDiffReplace(meta)) {
      patchedValue = meta.beforeValue as T;
    } else if (isDiffRename(meta)) {
      patchedValue = meta.beforeKey as T;
    }
  }
  return patchedValue;
};

export const applyMutationFromMeta = <T>(
  value: T,
  meta: Diff | DiffMetaRecord | undefined,
  mutation: 'add' | 'remove',
): T | null => {
  let patchedValue: T | null = value;
  if (meta) {
    if (isDiffMetaRecord(meta)) {
      for (let index in meta) {
        patchedValue = clone(patchedValue);
        const metaForIndex = meta[index];
        const patchedValueForIndex = applyMutationFromMeta(patchedValue[index], metaForIndex, mutation);
        if (patchedValueForIndex) {
          patchedValue[index] = patchedValueForIndex;
        } else {
          Array.isArray(patchedValue) && patchedValue.splice(Number.parseInt(index), 1);
        }
      }
    } else if (meta.action === mutation) {
      patchedValue = null;
    }
  }
  return patchedValue;
};

export function hasBeforeDeclarationPaths(diff: Diff | undefined): diff is DiffRemove | DiffReplace | DiffRename {
  if (!diff) return false
  return isDiffReplace(diff) || isDiffRename(diff) || isDiffRemove(diff)
}

export function hasAfterDeclarationPaths(diff: Diff | undefined): diff is DiffAdd | DiffReplace | DiffRename {
  if (!diff) return false
  return isDiffReplace(diff) || isDiffRename(diff) || isDiffAdd(diff)
}
