import { ClassifierType, DiffType } from '@netcracker/qubership-apihub-api-diff';
import { keys } from 'lodash';

export const diffMetaKey = Symbol('diffMeta');
export const childrenDiffCountMetaKey = Symbol('childrenDiffCountMetaKey');
export const selfDiffMetaKey = Symbol('selfDiffMeta');
export const schemaIdKey = Symbol('schemaIdKey');
export const syntheticTitleFlag = Symbol('syntheticTitleFlag');

export const DIFF_TYPES: DiffType[] = keys(ClassifierType) as DiffType[];

export const DIFF_TYPE_COLOR_MAP = {
  breaking: '#ED4A54',
  deprecated: '#F4B24D',
  'non-breaking': '#6BCE70',
  'semi-breaking': '#E98554',
  annotation: '#C55DCF',
  unclassified: '#61AAF2',
};

export const DIFF_BUDGES_COLOR_MAP = {
  breaking: '#DC5759',
  deprecated: '#F4B24D',
  'non-breaking': '#6BCE70',
  'semi-breaking': '#E98554',
  annotation: '#B866C9',
  unclassified: '#70A9EC',
};

export type WithDiffMetaKey<T> = T & {
  [diffMetaKey]: any;
};
