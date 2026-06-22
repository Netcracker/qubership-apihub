export const ATTRIBUTE_PRECEDED_BY = 'data-precededby'

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
}

export type WithPrecededByProps = {
  [ATTRIBUTE_PRECEDED_BY]?: PrecededBy
}
