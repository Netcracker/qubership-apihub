import { JsonSchemaTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeNodeMeta } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-meta"
import { BadgeKind, BADGE_KIND_ALTERNATIVE_INFO, BADGE_KIND_INFO } from "@apihub/components/kit/ux/UxBadge/types"
import { JsonSchemaNodeTypeCheckers } from "./node-type-checkers"

export const JsonSchemaNodeTitleVariants = {
  BADGE: 'badge',
  TEXT: 'text',
} as const;

export type JsonSchemaNodeTitleDisplay =
  | { variant: typeof JsonSchemaNodeTitleVariants.BADGE; text: string; badgeKind: BadgeKind }
  | { variant: typeof JsonSchemaNodeTitleVariants.TEXT; text: string }

export type ResolveJsonSchemaNodeTitleOptions = {
  node: JsonSchemaTreeNode
  meta: JsonSchemaTreeNodeMeta | null | undefined
  headerRowTitle?: string
}

const DEFAULT_HEADER_ROW_TITLE = "Type: "
const ADDITIONAL_PROPERTY_HEADER_ROW_TITLE = "additional property"
const NO_ADDITIONAL_PROPERTIES_HEADER_ROW_TITLE = "no additional properties"
const ADDITIONAL_ITEM_HEADER_ROW_TITLE = "additional item"
const ITEM_HEADER_ROW_TITLE = "item"

export class JsonSchemaNodeTitle {
  public static resolveDisplay(
    options: ResolveJsonSchemaNodeTitleOptions,
  ): JsonSchemaNodeTitleDisplay {
    const { node, meta, headerRowTitle } = options
    const kind = node.kind

    if (JsonSchemaNodeTypeCheckers.isRootNode(node)) {
      return { variant: JsonSchemaNodeTitleVariants.TEXT, text: headerRowTitle ?? DEFAULT_HEADER_ROW_TITLE }
    }

    if (kind === JsonSchemaTreeNodeKinds.ADDITIONAL_PROPERTIES) {
      const fragment = meta?._fragment ?? node.value()
      if (fragment === false) {
        return {
          variant: JsonSchemaNodeTitleVariants.BADGE,
          text: NO_ADDITIONAL_PROPERTIES_HEADER_ROW_TITLE,
          badgeKind: BADGE_KIND_ALTERNATIVE_INFO,
        }
      }
      return { variant: JsonSchemaNodeTitleVariants.BADGE, text: ADDITIONAL_PROPERTY_HEADER_ROW_TITLE, badgeKind: BADGE_KIND_INFO }
    }

    if (kind === JsonSchemaTreeNodeKinds.PATTERN_PROPERTY) {
      return { variant: JsonSchemaNodeTitleVariants.BADGE, text: ADDITIONAL_PROPERTY_HEADER_ROW_TITLE, badgeKind: BADGE_KIND_INFO }
    }

    if (kind === JsonSchemaTreeNodeKinds.ITEMS) {
      return { variant: JsonSchemaNodeTitleVariants.BADGE, text: ITEM_HEADER_ROW_TITLE, badgeKind: BADGE_KIND_INFO }
    }

    if (kind === JsonSchemaTreeNodeKinds.ADDITIONAL_ITEMS) {
      return { variant: JsonSchemaNodeTitleVariants.BADGE, text: ADDITIONAL_ITEM_HEADER_ROW_TITLE, badgeKind: BADGE_KIND_INFO }
    }

    if (kind === JsonSchemaTreeNodeKinds.ITEM) {
      return { variant: JsonSchemaNodeTitleVariants.TEXT, text: `[${String(node.key)}]` }
    }

    return { variant: JsonSchemaNodeTitleVariants.TEXT, text: String(node.key) }
  }
}
