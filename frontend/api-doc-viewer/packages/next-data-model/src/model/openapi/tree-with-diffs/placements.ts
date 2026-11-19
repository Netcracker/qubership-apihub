import { FieldPlacements } from "../../abstract/tree-with-diffs/field-placements"
import { NodeDiffsSeverityPlacemennt } from "../../abstract/tree-with-diffs/tree-node.interface"
import { SECURITY_FIELD_PLACEMENTS, SECURITY_NODE_PLACEMENTS } from "../../security/tree-with-diffs/placements"
import { OpenApiTreeNodeKind, OpenApiTreeNodeKinds } from "../types/node-kind"
import { OPENAPI_MEDIA_TYPE_OPTIONS_DIFF_KEY, OPENAPI_RESPONSE_OPTIONS_DIFF_KEY } from "./diff-keys"

const Placement = NodeDiffsSeverityPlacemennt

/**
 * Field diff -> the row it belongs to. One placement per row instance (D7). The Security kinds'
 * tables are shared (`model/security/tree-with-diffs/placements.ts`).
 */
export const OPENAPI_FIELD_PLACEMENTS: Readonly<Partial<Record<OpenApiTreeNodeKind, FieldPlacements>>> = {
  ...SECURITY_FIELD_PLACEMENTS,
  [OpenApiTreeNodeKinds.OPERATION]: {
    title: Placement.TitleRow,
    // The `deprecated` tag sits on the title row, else the operation ID row, else the address row
    // (view-dependent: `noHeading`): every candidate gets a placement with the tag merged in.
    deprecated: [Placement.TitleRow, Placement.OperationIdRowWithDeprecatedTag, Placement.AddressRowWithDeprecatedTag],
    operationId: [Placement.OperationIdRow, Placement.OperationIdRowWithDeprecatedTag],
    path: [Placement.AddressRow, Placement.AddressRowWithDeprecatedTag],
    externalDocs: Placement.ExternalDocsRow,
    description: Placement.DescriptionRow,
  },
  [OpenApiTreeNodeKinds.REQUEST_BODY]: {
    required: Placement.TitleRow,
    // The media-type selector sits in the Body title row.
    [OPENAPI_MEDIA_TYPE_OPTIONS_DIFF_KEY]: Placement.TitleRow,
    description: Placement.DescriptionRow,
  },
  [OpenApiTreeNodeKinds.CONTENT]: {
    [OPENAPI_MEDIA_TYPE_OPTIONS_DIFF_KEY]: Placement.TitleRow,
  },
  [OpenApiTreeNodeKinds.RESPONSES]: {
    // The response-code selector sits in the Responses title row.
    [OPENAPI_RESPONSE_OPTIONS_DIFF_KEY]: Placement.TitleRow,
  },
  [OpenApiTreeNodeKinds.RESPONSE]: {
    description: Placement.DescriptionRow,
  },
}

/** Rows a node renders: a whole add / remove badges each of them. */
export const OPENAPI_NODE_PLACEMENTS: Readonly<Partial<Record<OpenApiTreeNodeKind, readonly NodeDiffsSeverityPlacemennt[]>>> = {
  ...SECURITY_NODE_PLACEMENTS,
  [OpenApiTreeNodeKinds.OPERATION]: [
    Placement.TitleRow,
    Placement.OperationIdRow,
    Placement.OperationIdRowWithDeprecatedTag,
    Placement.AddressRow,
    Placement.AddressRowWithDeprecatedTag,
    Placement.ExternalDocsRow,
    Placement.DescriptionRow,
  ],
  [OpenApiTreeNodeKinds.REQUEST_BODY]: [Placement.TitleRow, Placement.DescriptionRow],
  [OpenApiTreeNodeKinds.RESPONSE]: [Placement.DescriptionRow],
}
