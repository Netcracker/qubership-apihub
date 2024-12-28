import { DeepPartial, IBundledHttpService } from '@stoplight/types';

import {
  AsyncOperationTransformer,
  AsyncServiceTransformer,
  ITransformOperationOpts,
  ITransformServiceOpts,
  TranslateFunction,
} from '../types';
import { AsyncApiDocument } from './asyncApiDocument';

export type AsyncTranslateFunction<P extends unknown[], R extends unknown = unknown> = TranslateFunction<
  DeepPartial<AsyncApiDocument>,
  P,
  R
>;

type HttpServiceBundle<T> = (opts: T) => IBundledHttpService;

/**
 * Service
 */
export type AsyncTransformServiceOpts = ITransformServiceOpts<DeepPartial<AsyncApiDocument>>;
export type AsyncServiceTransformerImpl = AsyncServiceTransformer<AsyncTransformServiceOpts>;
export type AsyncServiceBundle = HttpServiceBundle<AsyncTransformServiceOpts>;

/**
 * Operation
 */
export type AsyncTransformOperationOpts = ITransformOperationOpts<DeepPartial<AsyncApiDocument>>;
export type AsyncOperationTransformerImpl = AsyncOperationTransformer<AsyncTransformOperationOpts>;
