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
