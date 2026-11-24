import { DiffNodeMeta, DiffNodeValue } from '@netcracker/qubership-apihub-api-data-model'
import { LayoutMode } from '../LayoutMode'

export type PropsWithChanges = Partial<{
  layoutMode: LayoutMode
  level: number
}> & DiffNodeValue & DiffNodeMeta
