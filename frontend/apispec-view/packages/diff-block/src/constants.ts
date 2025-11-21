import {
  annotation,
  breaking,
  ClassifierType,
  deprecated,
  DiffType,
  nonBreaking,
  risky,
  unclassified,
} from '@netcracker/qubership-apihub-api-diff'
import { keys } from 'lodash';

export const diffsMetaKey = Symbol('diffMeta');
export const aggregatedDiffsMetaKey = Symbol('aggregatedDiffsMetaKey');
export const childrenDiffCountMetaKey = Symbol('childrenDiffCountMetaKey');
export const selfDiffMetaKey = Symbol('selfDiffMeta');
export const schemaIdKey = Symbol('schemaIdKey');
export const syntheticTitleFlag = Symbol('syntheticTitleFlag');

export const DIFF_TYPES: DiffType[] = keys(ClassifierType) as DiffType[];

export const DIFF_TYPE_COLOR_MAP = {
  [breaking]: '#ED4A54',
  [deprecated]: '#F4B24D',
  [nonBreaking]: '#6BCE70',
  [risky]: '#E98554',
  [annotation]: '#C55DCF',
  [unclassified]: '#61AAF2',
};

export const DIFF_BUDGES_COLOR_MAP = {
  [breaking]: '#DC5759',
  [deprecated]: '#F4B24D',
  [nonBreaking]: '#6BCE70',
  [risky]: '#E98554',
  [annotation]: '#B866C9',
  [unclassified]: '#70A9EC',
};

export const DIFF_TYPE_NAME_MAP: Record<DiffType, string> = {
  [breaking]: 'breaking',
  [risky]: 'requires attention',
  [deprecated]: 'deprecated',
  [nonBreaking]: 'non-breaking',
  [unclassified]: 'unclassified',
  [annotation]: 'annotation',
}
export type WithDiffMetaKey<T> = T & {
  [diffsMetaKey]: any;
};
