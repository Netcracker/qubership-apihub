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
import { createContext, memo, useContext, useState } from 'react'
import { GeneralPackageSettingsTabViewer } from './GeneralPackageSettingsTabViewer'
import { GeneralPackageSettingsTabEditor } from './GeneralPackageSettingsTabEditor'
import type { PackageSettingsTabProps } from '../package-settings'

export const GeneralPackageSettingsTab: FC<PackageSettingsTabProps> = memo<PackageSettingsTabProps>(({
    isPackageLoading,
  packageObject,
  }) => {
    const [editable, setEditable] = useState(false)

    return (
      <EditableGeneralPackageSettingsTabContentContext.Provider value={editable}>
        <SetEditableGeneralPackageSettingsTabContentContext.Provider value={setEditable}>
          <GeneralPackageSettingsTabViewer packageObject={packageObject}/>
          {!!packageObject &&
            <GeneralPackageSettingsTabEditor packageObject={packageObject} isPackageLoading={isPackageLoading}/>}
        </SetEditableGeneralPackageSettingsTabContentContext.Provider>
      </EditableGeneralPackageSettingsTabContentContext.Provider>
    )
  },
)

const EditableGeneralPackageSettingsTabContentContext = createContext<boolean>()
const SetEditableGeneralPackageSettingsTabContentContext = createContext<Dispatch<SetStateAction<boolean>>>()

export function useEditableGeneralPackageSettingsTabContent(): boolean {
  return useContext(EditableGeneralPackageSettingsTabContentContext)
}

export function useSetEditableGeneralPackageSettingsTabContent(): Dispatch<SetStateAction<boolean>> {
  return useContext(SetEditableGeneralPackageSettingsTabContentContext)
}
