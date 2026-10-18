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
  JSO_VIEWER = 'jso-viewer',
  JSO_PROPERTY = 'jso-property',
  BINDING_VERSION_ROW = 'binding-version-row',
  /* Assumption: 
    to simplify logic of data-precededby prop 
    we use fixed indent for `server-block` element independently of its children 
  */
  SERVER_BLOCK = 'server-block',
  SERVER_ADDRESS_ROW = 'server-address-row',
  DDL_TABLE_HEADER_ROW = 'ddl-table-header-row',
  DDL_TABLE_SCHEMA_ROW = 'ddl-table-schema-row',
  DDL_TABLE_DESCRIPTION_ROW = 'ddl-table-description-row',
  DDL_SECTION_HEADER = 'ddl-section-header',
  DDL_COLUMN_ROW = 'ddl-column-row',
  /** Follows a sibling column block that ended with an additional-info row. */
  DDL_COLUMN_AFTER_ADDITIONAL_INFO_ROW = 'ddl-column-after-additional-info-row',
  DDL_INDEX_ROW = 'ddl-index-row',
}

export type WithPrecededByProps = {
  [ATTRIBUTE_PRECEDED_BY]?: PrecededBy
}

export type WithDdlListLastRowProps = {
  [ATTRIBUTE_DDL_LIST_LAST_ROW]?: boolean
}
