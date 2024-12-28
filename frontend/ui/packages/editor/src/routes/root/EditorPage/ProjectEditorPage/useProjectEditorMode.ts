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

import { useModeSearchParam } from '../../useModeSearchParam'
import {
  CHANGES_PROJECT_EDITOR_MODE,
  FILES_PROJECT_EDITOR_MODE,
  PUBLISH_PROJECT_EDITOR_MODE, SETTINGS_PROJECT_EDITOR_MODE,
} from '@apihub/entities/editor-modes'

export function useIsFilesProjectEditorMode(): boolean {
  const [mode] = useModeSearchParam()
  return mode === FILES_PROJECT_EDITOR_MODE
}

export function useIsPublishProjectEditorMode(): boolean {
  const [mode] = useModeSearchParam()
  return mode === PUBLISH_PROJECT_EDITOR_MODE
}

export function useIsChangesProjectEditorMode(): boolean {
  const [mode] = useModeSearchParam()
  return mode === CHANGES_PROJECT_EDITOR_MODE
}

export function useIsSettingsProjectEditorMode(): boolean {
  const [mode] = useModeSearchParam()
  return mode === SETTINGS_PROJECT_EDITOR_MODE
}
