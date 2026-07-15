import {
  DdlApiColumnRowValue,
  DdlApiIndexRowValue,
  DdlApiSectionHeaderRowValue,
  DdlApiTableRowValue,
  DdlApiTreeNodeValue,
} from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiTreeNodeKind, DdlApiTreeNodeKinds } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeMeta } from "@apihub/next-data-model/model/ddlapi/types/node-meta";
import { isObjectWithStringKeys } from "../../../../utilities";
import { AbstractNodeDataBuilder, NodeDataPickFunction } from "../../../abstract/tree/node-data/builder";

const DDL_API_NODE_KINDS_WITH_NODE_VALUE: ReadonlySet<string> = new Set([
  DdlApiTreeNodeKinds.TABLE,
  DdlApiTreeNodeKinds.COLUMNS,
  DdlApiTreeNodeKinds.COLUMN,
  DdlApiTreeNodeKinds.INDEXES,
  DdlApiTreeNodeKinds.INDEX,
]);

type AnyDdlApiNodeValueKey =
  keyof DdlApiTreeNodeValue<typeof DdlApiTreeNodeKinds.TABLE> |
  keyof DdlApiTreeNodeValue<typeof DdlApiTreeNodeKinds.COLUMNS> |
  keyof DdlApiTreeNodeValue<typeof DdlApiTreeNodeKinds.COLUMN> |
  keyof DdlApiTreeNodeValue<typeof DdlApiTreeNodeKinds.INDEXES> |
  keyof DdlApiTreeNodeValue<typeof DdlApiTreeNodeKinds.INDEX>;

export class DdlApiNodeDataBuilder extends AbstractNodeDataBuilder<
  DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
  DdlApiTreeNodeMeta
> {
  public override createNodeMeta(value: unknown): DdlApiTreeNodeMeta {
    return {
      _fragment: value,
    };
  }

  public override createNodeValue(
    kind: string,
    key: PropertyKey,
    value: unknown,
    pick: NodeDataPickFunction,
  ): DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null {
    if (!isObjectWithStringKeys(value)) {
      return null;
    }
    if (!this.isDdlApiTreeNodeKindWithNodeValue(kind)) {
      return null;
    }

    return pick<DdlApiTreeNodeValue<DdlApiTreeNodeKind>>(
      value,
      DdlApiNodeDataBuilder.getDdlApiTreeNodeValueProps(kind),
    );
  }

  private isDdlApiTreeNodeKindWithNodeValue(kind: string): kind is DdlApiTreeNodeKind {
    return DDL_API_NODE_KINDS_WITH_NODE_VALUE.has(kind);
  }

  public static getDdlApiTreeNodeValueProps(type: DdlApiTreeNodeKind): (keyof DdlApiTreeNodeValue<DdlApiTreeNodeKind>)[];
  public static getDdlApiTreeNodeValueProps(type: typeof DdlApiTreeNodeKinds.TABLE): (keyof DdlApiTableRowValue)[];
  public static getDdlApiTreeNodeValueProps(type: typeof DdlApiTreeNodeKinds.COLUMNS): (keyof DdlApiSectionHeaderRowValue)[];
  public static getDdlApiTreeNodeValueProps(type: typeof DdlApiTreeNodeKinds.COLUMN): (keyof DdlApiColumnRowValue)[];
  public static getDdlApiTreeNodeValueProps(type: typeof DdlApiTreeNodeKinds.INDEXES): (keyof DdlApiSectionHeaderRowValue)[];
  public static getDdlApiTreeNodeValueProps(type: typeof DdlApiTreeNodeKinds.INDEX): (keyof DdlApiIndexRowValue)[];
  public static getDdlApiTreeNodeValueProps(type: DdlApiTreeNodeKind): AnyDdlApiNodeValueKey[] {
    switch (type) {
      case DdlApiTreeNodeKinds.TABLE:
        return [
          'tableName',
          'schemaName',
          'description',
        ] satisfies (keyof DdlApiTableRowValue)[];
      case DdlApiTreeNodeKinds.COLUMNS:
      case DdlApiTreeNodeKinds.INDEXES:
        return [
          'title',
        ] satisfies (keyof DdlApiSectionHeaderRowValue)[];
      case DdlApiTreeNodeKinds.COLUMN:
        return [
          'columnName',
          'columnType',
          'enumValues',
          'isPrimaryKey',
          'isForeignKey',
          'foreignKeyTarget',
          'isGenerated',
          'generatedBy',
          'isUnique',
          'isNotNull',
          'defaultValue',
          'generatedExpression',
          'description',
        ] satisfies (keyof DdlApiColumnRowValue)[];
      case DdlApiTreeNodeKinds.INDEX:
        return [
          'indexName',
          'partNames',
          'isUnique',
          'description',
        ] satisfies (keyof DdlApiIndexRowValue)[];
      default:
        return [];
    }
  }
}
