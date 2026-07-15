import { TableKey } from "@apihub/next-data-model/shared/ddlapi/types/table-key";
import { DiffMetaKeys } from "../../abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { BuildingServiceLogger } from "../../../loggers";
import {
  DdlApiSpecTransformer,
  DdlApiTableOrientedSpec,
  DdlApiTableOrientedSpecColumnsSection,
  DdlApiTableOrientedSpecIndexesSection,
} from "./ddlapi-spec-transformer";

export interface DdlApiTableOrientedSpecColumnsSectionWithDiffs extends DdlApiTableOrientedSpecColumnsSection {
  [key: symbol]: unknown;
}

export interface DdlApiTableOrientedSpecIndexesSectionWithDiffs extends DdlApiTableOrientedSpecIndexesSection {
  [key: symbol]: unknown;
}

export interface DdlApiTableOrientedSpecWithDiffs extends DdlApiTableOrientedSpec {
  readonly columns: DdlApiTableOrientedSpecColumnsSectionWithDiffs;
  readonly indexes: DdlApiTableOrientedSpecIndexesSectionWithDiffs;
  [key: symbol]: unknown;
}

export class DdlApiSpecWithDiffsTransformer extends DdlApiSpecTransformer {
  constructor(
    logger: BuildingServiceLogger,
    protected readonly diffsMetaKeys: DiffMetaKeys,
  ) {
    super(logger)
  }

  public transformSourceToTableOrientedSpecWithDiffs(
    source: unknown,
    tableKey: TableKey,
  ): DdlApiTableOrientedSpecWithDiffs | null {
    const prepared = this.transformSourceToTableOrientedSpec(source, tableKey)
    if (!prepared) {
      return null
    }

    return this.attachDiffMetadataToTableOrientedSpec(prepared)
  }

  protected attachDiffMetadataToTableOrientedSpec(
    spec: DdlApiTableOrientedSpec,
  ): DdlApiTableOrientedSpecWithDiffs {
    // TODO: attach merged-document diff metadata under diffsMetaKeys on crawl fragments
    void this.diffsMetaKeys
    return this.createTableOrientedSpecWithDiffs(spec)
  }

  protected createTableOrientedSpecWithDiffs(
    spec: DdlApiTableOrientedSpec,
  ): DdlApiTableOrientedSpecWithDiffs {
    return {
      ...spec,
      columns: { ...spec.columns },
      indexes: { ...spec.indexes },
    }
  }
}
