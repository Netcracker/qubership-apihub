import { ClassifierType, DiffType } from '@netcracker/qubership-apihub-api-diff';
import { keys } from 'lodash';

export const diffMetaKey = Symbol('diffMeta');
export const childrenDiffCountMetaKey = Symbol('childrenDiffCountMetaKey');
export const selfDiffMetaKey = Symbol('selfDiffMeta');
export const schemaIdKey = Symbol('schemaIdKey');
export const syntheticTitleFlag = Symbol('syntheticTitleFlag');

export const DIFF_TYPES: DiffType[] = keys(ClassifierType) as DiffType[];

export const BREAKING_CHANGE_SEVERITY = 'breaking'
export const NON_BREAKING_CHANGE_SEVERITY = 'non-breaking'
export const SEMI_BREAKING_CHANGE_SEVERITY = 'semi-breaking'
export const DEPRECATED_CHANGE_SEVERITY = 'deprecated'
export const ANNOTATION_CHANGE_SEVERITY = 'annotation'
export const UNCLASSIFIED_CHANGE_SEVERITY = 'unclassified'

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

export const CHANGE_SEVERITY_NAME_MAP: Record<DiffType, string> = {
  [BREAKING_CHANGE_SEVERITY]: 'breaking',
  [SEMI_BREAKING_CHANGE_SEVERITY]: 'risky',
  [DEPRECATED_CHANGE_SEVERITY]: 'deprecated',
  [NON_BREAKING_CHANGE_SEVERITY]: 'non-breaking',
  [UNCLASSIFIED_CHANGE_SEVERITY]: 'unclassified',
  [ANNOTATION_CHANGE_SEVERITY]: 'annotation',
}
export type WithDiffMetaKey<T> = T & {
  [diffMetaKey]: any;
};
