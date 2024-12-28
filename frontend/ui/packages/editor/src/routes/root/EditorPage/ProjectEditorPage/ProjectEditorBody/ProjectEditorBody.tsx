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

import type { FC } from 'react'
import { memo } from 'react'
import {
  useIsChangesProjectEditorMode,
  useIsFilesProjectEditorMode,
  useIsPublishProjectEditorMode,
  useIsSettingsProjectEditorMode,
} from '../useProjectEditorMode'
import { FilesModeBody } from './FilesModeBody/FilesModeBody'
import { PublishModeBody } from './PublishModeBody/PublishModeBody'
import { ChangesModeBody } from './ChangesModeBody/ChangesModeBody'
import { SettingsModeBody } from './SettingsModeBody/SettingsModeBody'

export const ProjectEditorBody: FC = memo(() => {
  const isFilesEditorPageMode = useIsFilesProjectEditorMode()
  const isPublishEditorMode = useIsPublishProjectEditorMode()
  const isChangesEditorPageMode = useIsChangesProjectEditorMode()
  const isSettingsEditorMode = useIsSettingsProjectEditorMode()

  if (isFilesEditorPageMode) {
    return (
      <FilesModeBody/>
    )
  }

  if (isPublishEditorMode) {
    return (
      <PublishModeBody/>
    )
  }

  if (isChangesEditorPageMode) {
    return (
      <ChangesModeBody/>
    )
  }

  if (isSettingsEditorMode) {
    return (
      <SettingsModeBody/>
    )
  }

  return null
})
