import { API_AUDIENCE_COLUMN_ID, API_KIND_COLUMN_ID } from '@netcracker/qubership-apihub-ui-shared/entities/table-columns'

export const CUSTOM_METADATA_COLUMN_ID = 'custom-metadata'
export const STATUS_COLUMN_ID = 'status'
export const COLUMNS_SIZES_MAP: Record<string, number> = {
  [API_AUDIENCE_COLUMN_ID]: 100,
  [API_KIND_COLUMN_ID]: 100,
}
