import {
  ChangedPropertyMetaData,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { isChangedPropertyMetaData } from "@apihub/next-data-model/model/abstract/tree-with-diffs/changed-property-meta-data";
import {
  DDL_PROPERTY_TITLE_ROW_DIFF_KEY,
} from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs.types";

export { isChangedPropertyMetaData };

export function hasDdlPropertyTitleRowDiff(
  nodeDiffs: Partial<Record<string, ChangedPropertyMetaData>>,
): nodeDiffs is Partial<Record<string, ChangedPropertyMetaData>> &
  Record<typeof DDL_PROPERTY_TITLE_ROW_DIFF_KEY, ChangedPropertyMetaData> {
  return isChangedPropertyMetaData(nodeDiffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY])
}
