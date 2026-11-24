export const ATTRIBUTE_PRECEDED_BY = 'data-precededby'
export const ATTRIBUTE_DDL_LIST_LAST_ROW = 'data-ddl-list-last-row'

export enum PrecededBy {
  ROOT = 'root',
  ADDRESS_ROW = 'address-row',
  DESCRIPTION_ROW = 'description-row',
  SUMMARY_ROW = 'summary-row',
  MESSAGE_SECTION_SELECTOR = 'message-section-selector',
  MESSAGE_SECTION_HEADER_HIGH_LEVEL = 'message-section-header-high-level',
  MESSAGE_SECTION_HEADER_LOW_LEVEL = 'message-section-header-low-level',
  JSON_SCHEMA_VIEWER = 'json-schema-viewer',
  JSON_SCHEMA_PROPERTY = 'json-schema-property',
  JSO_VIEWER = 'jso-viewer',
  JSO_PROPERTY = 'jso-property',
  BINDING_VERSION_ROW = 'binding-version-row',
  /* Assumption: 
    to simplify logic of data-precededby prop 
    we use fixed indent for `server-block` element independently of its children 
  */
  SERVER_BLOCK = 'server-block',
  SERVER_ADDRESS_ROW = 'server-address-row',
  /** Follows an AsyncAPI Security section (operation or server): its last card's lower half-gap is already there. */
  SECURITY_SECTION = 'security-section',
  DDL_TABLE_HEADER_ROW = 'ddl-table-header-row',
  DDL_TABLE_SCHEMA_ROW = 'ddl-table-schema-row',
  DDL_TABLE_DESCRIPTION_ROW = 'ddl-table-description-row',
  DDL_SECTION_HEADER = 'ddl-section-header',
  DDL_COLUMN_ROW = 'ddl-column-row',
  /** Follows a sibling column block that ended with an additional-info row. */
  DDL_COLUMN_AFTER_ADDITIONAL_INFO_ROW = 'ddl-column-after-additional-info-row',
  DDL_INDEX_ROW = 'ddl-index-row',
  /* Separator layout (OpenAPI operation, Security sections of every API type): rows have no vertical
     padding; every gap is a separator row. Design: docs/design/openapi/features/vertical-gaps.md */
  /** Any row of a separator layout. */
  SEPARATOR_LAYOUT_ROW = 'separator-layout-row',
  /** The first row of a nested JSON Schema / JSO viewer under such a row: keeps its own inset (`--separator-layout-nested-viewer-inset`). */
  SEPARATOR_LAYOUT_NESTED_VIEWER_START = 'separator-layout-nested-viewer-start',
}

export type WithPrecededByProps = {
  [ATTRIBUTE_PRECEDED_BY]?: PrecededBy
}

export type WithListLastRowProps = {
  [ATTRIBUTE_DDL_LIST_LAST_ROW]?: boolean
}

/** @deprecated Use {@link WithListLastRowProps} */
export type WithDdlListLastRowProps = WithListLastRowProps
