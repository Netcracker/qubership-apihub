import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys"
import { isObject } from "@apihub/next-data-model/utilities"
import { aggregateDiffsWithRollup } from "@netcracker/qubership-apihub-api-diff"
import { BuildingServiceLogger } from "../../../loggers"

export type JsonSchemaWithDiffs = Record<string, unknown> & {
  [key: symbol]: unknown
}

export class JsonSchemaSpecWithDiffsTransformer {
  constructor(
    private readonly logger: BuildingServiceLogger,
    private readonly diffMetaKeys: DiffMetaKeys,
  ) {}

  public transformSourceToSchemaWithDiffs(source: unknown): JsonSchemaWithDiffs | null {
    if (!isObject(source)) {
      return null
    }

    const { diffsMetaKey, aggregatedDiffsMetaKey } = this.diffMetaKeys
    aggregateDiffsWithRollup(source, diffsMetaKey, aggregatedDiffsMetaKey)
    this.logger.debug("[JSON Schema][WithDiffs] Prepared source with rollup:", source)
    return source
  }
}
