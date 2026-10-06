/**
 * Font colors for JSON Schema type-value rendering (title-row subheader, nesting-indicator
 * row). Scoped to this component tree only - does NOT change the generic, cross-viewer
 * NestingIndicatorTitleLabel's own default (`text-slate-400`), which stays untouched for DDL,
 * JSO, AsyncAPI, and JSON Schema's own combiner-kind nesting indicator title.
 */
export const JSON_SCHEMA_TYPE_VALUE_DEFAULT_COLOR = "#64748B" // slate-500, title-row default
export const JSON_SCHEMA_NESTING_INDICATOR_TYPE_VALUE_COLOR = "#94A3B8" // slate-400, nesting-indicator override
