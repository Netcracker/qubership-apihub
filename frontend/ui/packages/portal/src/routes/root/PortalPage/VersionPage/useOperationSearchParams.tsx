import { useOperationViewMode } from './useOperationViewMode'
import { useFileViewMode } from './useFileViewMode'
import { useSidebarPlaygroundViewMode } from './useSidebarPlaygroundViewMode'
import { useDocumentSearchParam } from './useDocumentSearchParam'
import { useRefSearchParam } from '../useRefSearchParam'
import { YAML_FILE_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/file-format-view'
import type { OperationViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'

export function useOperationSearchParams(): OperationSearchParams {
  const { mode } = useOperationViewMode()
  const [fileViewMode = YAML_FILE_VIEW_MODE] = useFileViewMode()
  const [playgroundViewMode = ''] = useSidebarPlaygroundViewMode()
  const [ref] = useRefSearchParam()
  const [documentSlug] = useDocumentSearchParam()

  return {
    mode,
    fileViewMode,
    playgroundViewMode,
    ref,
    documentSlug,
  }
}

export type OperationSearchParams = {
  mode: OperationViewMode
  fileViewMode: string | undefined
  playgroundViewMode: string
  ref: string | undefined
  documentSlug: string | undefined
}
