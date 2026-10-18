import { DeepPartial } from '@stoplight/types';
import { OpenAPIObject } from 'openapi3-ts';

import { TranslateFunction } from '../types';

export type Oas3WithMetaTranslateFunction<P extends unknown[], R extends unknown = unknown> = TranslateFunction<
  DeepPartial<OpenAPIObject>,
  P,
  R
>;

// Parameters Diff Meta types

type DiffType = 'breaking' | 'non-breaking' | 'annotation' | 'unclassified' | 'deprecated';
type DiffAction = 'add' | 'remove' | 'replace';

export type ParameterDiffMetaData = {
  type: DiffType;
  action: DiffAction;
  beforeValue?: object | string | number | Array<object | string | number>;
};

export type ParametersArrayDiffMetaData = {
  [index: number]: ParameterDiffMetaData;
};

export type ParameterObjectDiffMetaData = {
  [index: string]: ParameterDiffMetaData;
};

export type ParametersDiffMetaData = {
  parameters: {
    array: ParametersArrayDiffMetaData;
  };
} | null;
