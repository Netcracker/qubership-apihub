/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
