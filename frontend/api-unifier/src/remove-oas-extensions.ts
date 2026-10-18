import {
  InternalRemoveOasExtensionsOptions,
  NormalizationRule,
  OpenApiExtensionKey,
  RemoveOasExtensionsOptions,
} from './types'
import { resolveSpec, SPEC_TYPE_GRAPH_API } from './spec-type'
import { syncClone, SyncCloneHook } from '@netcracker/qubership-apihub-json-crawl'
import { RULES } from './rules'
import { createCycledJsoHandlerHook } from './cycle-jso'

const createRemoveOasExtensionsHook: (options: InternalRemoveOasExtensionsOptions) => RemoveOasExtensionsCrawlHook = (options) => {
  const removeOasExtensionsHook: RemoveOasExtensionsCrawlHook = ({ key, value, rules }) => {
    if (rules?.isExtension && options.shouldRemoveOasExtension?.(key as OpenApiExtensionKey)) {
      return { value: undefined }
    }

    return { value }
  }

  return removeOasExtensionsHook
}

type RemoveOasExtensionsCrawlHook = SyncCloneHook<RemoveOasExtensionsCrawlState, NormalizationRule>

export interface RemoveOasExtensionsCrawlState {}

export const removeOasExtensions = (value: unknown, options?: RemoveOasExtensionsOptions) => {
  const internalOptions = {
    ...options,
  }
  const spec = resolveSpec(value)
  if (spec.type === SPEC_TYPE_GRAPH_API) {
    return value
  }
  const cycledJsoHandlerHook = createCycledJsoHandlerHook<RemoveOasExtensionsCrawlState, NormalizationRule>()
  return syncClone<RemoveOasExtensionsCrawlState, NormalizationRule>(
    value,
    [
      cycledJsoHandlerHook,
      createRemoveOasExtensionsHook(internalOptions)
    ],
    { rules: RULES[spec.type] },
  )
}
