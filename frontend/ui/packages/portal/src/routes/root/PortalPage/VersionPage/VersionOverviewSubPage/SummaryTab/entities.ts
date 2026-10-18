export const SUMMARY_METRIC_LABEL_VARIANT_DEFAULT = 'default' as const
export const SUMMARY_METRIC_LABEL_VARIANT_EMPHASIZED = 'emphasized' as const

export type SummaryMetricLabelVariant =
  | typeof SUMMARY_METRIC_LABEL_VARIANT_DEFAULT
  | typeof SUMMARY_METRIC_LABEL_VARIANT_EMPHASIZED

export const SUMMARY_IMPACTED_ENTITY_OPERATIONS = 'operations' as const
export const SUMMARY_IMPACTED_ENTITY_TABLES = 'tables' as const

export type SummaryImpactedEntity =
  | typeof SUMMARY_IMPACTED_ENTITY_OPERATIONS
  | typeof SUMMARY_IMPACTED_ENTITY_TABLES
