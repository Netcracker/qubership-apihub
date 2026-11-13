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
  PROPERTY_TABLE_HEADER_ROW = 'property-table-header-row',
  PROPERTY_TABLE_SUBHEADER_ROW = 'property-table-subheader-row',
  DDL_TABLE_DESCRIPTION_ROW = 'ddl-table-description-row',
  DDL_SECTION_HEADER = 'ddl-section-header',
  PROPERTY_TABLE_ROW = 'property-table-row',
  /** Follows a sibling column block that ended with an additional-info row. */
  PROPERTY_TABLE_ROW_AFTER_ADDITIONAL_INFO = 'property-table-row-after-additional-info',
  DDL_INDEX_ROW = 'ddl-index-row',
}

export type WithPrecededByProps = {
  [ATTRIBUTE_PRECEDED_BY]?: PrecededBy
}

export type WithListLastRowProps = {
  [ATTRIBUTE_DDL_LIST_LAST_ROW]?: boolean
}

/** @deprecated Use {@link WithListLastRowProps} */
export type WithDdlListLastRowProps = WithListLastRowProps
