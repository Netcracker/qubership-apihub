import { NODE_LEVEL_DIFF_KEY } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { isSpecificationExtensionKey } from "@apihub/next-data-model/model/specification-extension-key";
import { OperationKeys } from "@apihub/next-data-model/shared/async-api/types/operation-keys";
import { findKeyByValue, getValueByPath, isArray, isObject, isObjective, takeIfDiffsRecord } from "@apihub/next-data-model/utilities";
import { aggregateDiffsWithRollup, Diff, DiffType } from "@netcracker/qubership-apihub-api-diff";
import { DiffMetaKeys } from "../../abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { AsyncApiLogger } from "../logging";
import {
  AsyncApiMessageOrientedSpec,
  AsyncApiMessageOrientedSpecData,
  AsyncApiMessageOrientedSpecDataChannel,
  AsyncApiMessageOrientedSpecDataContent,
  AsyncApiMessageOrientedSpecDataOperation,
  AsyncApiSpecTransformer
} from "./async-api-spec-transformer";

export interface AsyncApiMessageOrientedSpecDataContentWithDiffs extends AsyncApiMessageOrientedSpecDataContent {
  headers?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  [key: symbol]: unknown;
}

export interface AsyncApiMessageOrientedSpecDataChannelWithDiffs extends AsyncApiMessageOrientedSpecDataChannel {
  [key: symbol]: unknown;
}

export interface AsyncApiMessageOrientedSpecDataOperationWithDiffs extends AsyncApiMessageOrientedSpecDataOperation {
  [key: symbol]: unknown;
}

export interface AsyncApiMessageOrientedSpecDataWithDiffs extends AsyncApiMessageOrientedSpecData {
  content: AsyncApiMessageOrientedSpecDataContentWithDiffs;
  channel: AsyncApiMessageOrientedSpecDataChannelWithDiffs;
  operation: AsyncApiMessageOrientedSpecDataOperationWithDiffs;
  [key: symbol]: unknown;
}

export interface AsyncApiMessageOrientedSpecWithDiffs extends AsyncApiMessageOrientedSpec {
  data: AsyncApiMessageOrientedSpecDataWithDiffs;
  [key: symbol]: unknown;
}

export class AsyncApiSpecWithDiffsTransformer extends AsyncApiSpecTransformer {
  constructor(
    referenceNamePropertyKey: symbol,
    logger: AsyncApiLogger,
    private readonly diffMetaKeys: DiffMetaKeys,
  ) {
    super(referenceNamePropertyKey, logger)
  }

  public override transformOperationOrientedSpecToMessageOrientedSpec(
    source: unknown,
    operationKeys?: OperationKeys,
  ): AsyncApiMessageOrientedSpecWithDiffs | null {
    if (!this.isAsyncApiSpecification(source)) {
      return null
    }

    const resolvedOperationKeys = this.operationKeysOrDefaults(source, operationKeys)
    if (!resolvedOperationKeys) {
      return null
    }
    const { operationKey, messageKey } = resolvedOperationKeys
    const { diffsMetaKey, aggregatedDiffsMetaKey } = this.diffMetaKeys

    const transformed = super.transformOperationOrientedSpecToMessageOrientedSpec(source, resolvedOperationKeys)

    if (!transformed) {
      return null
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const operationsDiffsRecord = takeIfDiffsRecord(
      getValueByPath(source, ['operations', diffsMetaKey], this.referenceNamePropertyKey)
    )
    const operationFieldsDiffsRecord = takeIfDiffsRecord(
      getValueByPath(source, ['operations', operationKey, diffsMetaKey], this.referenceNamePropertyKey)
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const operationBindingsDiffsRecord = takeIfDiffsRecord(
      getValueByPath(source, ['operations', operationKey, 'bindings', diffsMetaKey], this.referenceNamePropertyKey)
    )

    const channelFieldsDiffsRecord = takeIfDiffsRecord(
      getValueByPath(source, ['operations', operationKey, 'channel', diffsMetaKey], this.referenceNamePropertyKey)
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const channelBindingsDiffsRecord = takeIfDiffsRecord(
      getValueByPath(source, ['operations', operationKey, 'channel', 'bindings', diffsMetaKey], this.referenceNamePropertyKey)
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const channelServersDiffsRecord = takeIfDiffsRecord(
      getValueByPath(source, ['operations', operationKey, 'channel', 'servers', diffsMetaKey], this.referenceNamePropertyKey)
    )

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const messagesDiffsRecord = takeIfDiffsRecord(
      getValueByPath(source, ['operations', operationKey, 'messages', diffsMetaKey], this.referenceNamePropertyKey)
    )
    const messageFieldsDiffsRecord = takeIfDiffsRecord(
      getValueByPath(source, ['operations', operationKey, 'messages', messageKey, diffsMetaKey], this.referenceNamePropertyKey)
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const messageBindingsDiffsRecord = takeIfDiffsRecord(
      getValueByPath(source, ['operations', operationKey, 'messages', messageKey, 'bindings', diffsMetaKey], this.referenceNamePropertyKey)
    )

    const targetMessage = getValueByPath(source, ['operations', operationKey, 'messages', messageKey], this.referenceNamePropertyKey)
    const targetMessageList = getValueByPath(source, ['operations', operationKey, 'messages'], this.referenceNamePropertyKey)
    const targetMessageKey = isObject(targetMessage) && isObjective(targetMessageList) ? findKeyByValue(targetMessageList, targetMessage) : undefined

    const wholeOperationDiff = (
      targetMessageKey && typeof targetMessageKey !== 'symbol' ? messagesDiffsRecord?.[targetMessageKey] : undefined
    ) ?? (
      operationKey && typeof operationKey !== 'symbol' ? operationsDiffsRecord?.[operationKey] : undefined
    )
    // TODO 31.03.26 // Invent something to migrate 'bindingVersion' diffs from 'binding' property to our synthetic representation for binding

    const transformedWithDiffs = transformed as AsyncApiMessageOrientedSpecWithDiffs

    if (!(diffsMetaKey in transformedWithDiffs)) {
      const diffTitle = messageFieldsDiffsRecord?.title
      const diffName = messageFieldsDiffsRecord?.name
      const diffDescription = messageFieldsDiffsRecord?.description
      const diffSummary = messageFieldsDiffsRecord?.summary
      const diffAddress = channelFieldsDiffsRecord?.address
      const diffHeaders = messageFieldsDiffsRecord?.headers
      const diffPayload = messageFieldsDiffsRecord?.payload

      const extensions = transformedWithDiffs.data.content.extensions
      if (extensions && !(diffsMetaKey in extensions)) {
        const diffsExtensions = Object.keys(messageFieldsDiffsRecord ?? {}).reduce((acc, key) => {
          if (!isSpecificationExtensionKey(key)) {
            return acc
          }
          const extensionDiff = messageFieldsDiffsRecord?.[key]
          if (!extensionDiff) {
            return acc
          }
          acc[key] = extensionDiff
          return acc
        }, {} as Record<string, Diff<DiffType>>)
        transformedWithDiffs.data.content.extensions = Object.assign(extensions, { [diffsMetaKey]: diffsExtensions })
      }

      const content = transformedWithDiffs.data.content
      if (content && !(diffsMetaKey in content)) {
        const diffContent = {
          ...(diffHeaders ? { headers: diffHeaders } : {}),
          ...(diffPayload ? { payload: diffPayload } : {}),
        }
        transformedWithDiffs.data.content = Object.assign(content, { [diffsMetaKey]: diffContent })
      }

      transformedWithDiffs[diffsMetaKey] = {
        ...(wholeOperationDiff ? { [NODE_LEVEL_DIFF_KEY]: wholeOperationDiff } : {}),
        ...(diffTitle ? { title: diffTitle } : {}),
        ...(diffName ? { internalTitle: diffName } : {}),
        ...(diffDescription ? { description: diffDescription } : {}),
        ...(diffSummary ? { summary: diffSummary } : {}),
        ...(diffAddress ? { address: diffAddress } : {}),
      }
    }

    // channel
    if (!(diffsMetaKey in transformedWithDiffs.data.channel)) {
      const diffTitle = channelFieldsDiffsRecord?.title
      const diffDescription = channelFieldsDiffsRecord?.description
      const diffSummary = channelFieldsDiffsRecord?.summary
      const diffAddress = channelFieldsDiffsRecord?.address

      const extensions = transformedWithDiffs.data.channel.extensions
      if (extensions && !(diffsMetaKey in extensions)) {
        const diffsExtensions = Object.keys(channelFieldsDiffsRecord ?? {}).reduce((acc, key) => {
          if (!isSpecificationExtensionKey(key)) {
            return acc
          }
          const extensionDiff = channelFieldsDiffsRecord?.[key]
          if (!extensionDiff) {
            return acc
          }
          acc[key] = extensionDiff
          return acc
        }, {} as Record<string, Diff<DiffType>>)
        transformedWithDiffs.data.channel.extensions = Object.assign(extensions, { [diffsMetaKey]: diffsExtensions })
      }

      transformedWithDiffs.data.channel[diffsMetaKey] = {
        ...(diffTitle ? { title: diffTitle } : {}),
        ...(diffDescription ? { description: diffDescription } : {}),
        ...(diffSummary ? { summary: diffSummary } : {}),
        ...(diffAddress ? { address: diffAddress } : {}),
      }
    }

    // operation
    if (!(diffsMetaKey in transformedWithDiffs.data.operation)) {
      const diffTitle = operationFieldsDiffsRecord?.title
      const diffDescription = operationFieldsDiffsRecord?.description
      const diffSummary = operationFieldsDiffsRecord?.summary

      const extensions = transformedWithDiffs.data.operation.extensions
      if (extensions && !(diffsMetaKey in extensions)) {
        const diffsExtensions = Object.keys(operationFieldsDiffsRecord ?? {}).reduce((acc, key) => {
          if (!isSpecificationExtensionKey(key)) {
            return acc
          }
          const extensionDiff = operationFieldsDiffsRecord?.[key]
          if (!extensionDiff) {
            return acc
          }
          acc[key] = extensionDiff
          return acc
        }, {} as Record<string, Diff<DiffType>>)
        transformedWithDiffs.data.operation.extensions = Object.assign(extensions, { [diffsMetaKey]: diffsExtensions })
      }

      transformedWithDiffs.data.operation[diffsMetaKey] = {
        ...(diffTitle ? { title: diffTitle } : {}),
        ...(diffDescription ? { description: diffDescription } : {}),
        ...(diffSummary ? { summary: diffSummary } : {}),
      }
    }

    // ATTENTION: It is IMPORTANT to aggregate diffs on TRANSFORMED DOCUMENT
    aggregateDiffsWithRollup(transformedWithDiffs, diffsMetaKey, aggregatedDiffsMetaKey)

    return transformedWithDiffs
  }

  private hasOnlyAllowedDiffMetaSymbols(value: unknown): boolean {
    if (!isObject(value) && !isArray(value)) {
      return true
    }

    if (isArray(value)) {
      return value.every((item) => this.hasOnlyAllowedDiffMetaSymbols(item))
    }

    const allowedSymbols = new Set<symbol>([
      this.diffMetaKeys.diffsMetaKey,
      this.diffMetaKeys.aggregatedDiffsMetaKey,
    ])

    const currentSymbols = Object.getOwnPropertySymbols(value)
    const hasOnlyAllowedCurrentSymbols = currentSymbols.every((symbolKey) => allowedSymbols.has(symbolKey))
    if (!hasOnlyAllowedCurrentSymbols) {
      return false
    }

    return Object.values(value).every((nestedValue) => this.hasOnlyAllowedDiffMetaSymbols(nestedValue))
  }
}
