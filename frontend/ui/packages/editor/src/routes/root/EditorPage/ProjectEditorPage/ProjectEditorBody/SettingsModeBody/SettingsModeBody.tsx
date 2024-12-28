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

import type { Dispatch, FC, SetStateAction } from 'react'
import { createContext, memo, useContext, useEffect, useState } from 'react'

import { useSettingSearchParam } from '../../useSettingSearchParam'
import { GENERAL_SETTINGS_TAB } from '../../ProjectEditorSidebar/SettingsTabPanel'
import { usePackage } from '../../../../usePackage'
import { useProject } from '../../../../useProject'
import { EMPTY_PROJECT } from '@apihub/entities/projects'
import { SettingsViewerGeneral } from './SettingsTabGeneral/SettingsViewerGeneral'
import { SettingsEditorGeneral } from './SettingsTabGeneral/SettingsEditorGeneral'

/* TODO 15.08.23 // Refactor these forms
Form auto-fills & works in not obvious way.
Now 'packageKey' filling/auto-filling in Editor has been implemented via state & effect,
because filling + custom search = working wrong in native way.
 */

export const SettingsModeBody: FC = memo(() => {
  const [editable, setEditable] = useState(false)
  const [selectedSetting, setSelectedSetting] = useSettingSearchParam()

  useEffect(() => {
    if (!selectedSetting) {
      setSelectedSetting(GENERAL_SETTINGS_TAB)
    }
    setEditable(false)
  }, [selectedSetting, setSelectedSetting])

  const [project] = useProject()
  const [packageObj] = usePackage(project?.packageKey)

  return (
    <EditableSettingsTabContentContext.Provider value={editable}>
      <SetEditableSettingsTabContentContext.Provider value={setEditable}>
        <SettingsViewerGeneral project={project ?? EMPTY_PROJECT} packageObj={packageObj}/>
        <SettingsEditorGeneral project={project ?? EMPTY_PROJECT} packageObj={packageObj}/>
      </SetEditableSettingsTabContentContext.Provider>
    </EditableSettingsTabContentContext.Provider>
  )
})

const EditableSettingsTabContentContext = createContext<boolean>()
const SetEditableSettingsTabContentContext = createContext<Dispatch<SetStateAction<boolean>>>()

export function useEditableSettingsTabContent(): boolean {
  return useContext(EditableSettingsTabContentContext)
}

export function useSetEditableSettingsTabContent(): Dispatch<SetStateAction<boolean>> {
  return useContext(SetEditableSettingsTabContentContext)
}
