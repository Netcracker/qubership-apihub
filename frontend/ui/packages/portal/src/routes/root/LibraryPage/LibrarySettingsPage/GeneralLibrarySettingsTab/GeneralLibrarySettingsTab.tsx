import { createContext, type Dispatch, type FC, memo, type SetStateAction, useContext, useState } from 'react'

import type { LibrarySettingsTabProps } from '../librarySettings'
import { GeneralLibrarySettingsTabEditor } from './GeneralLibrarySettingsTabEditor'
import { GeneralLibrarySettingsTabViewer } from './GeneralLibrarySettingsTabViewer'

export const GeneralLibrarySettingsTab: FC<LibrarySettingsTabProps> = memo<LibrarySettingsTabProps>(
  ({ library }) => {
    const [editable, setEditable] = useState(false)

    return (
      <EditableGeneralLibrarySettingsTabContentContext.Provider value={editable}>
        <SetEditableGeneralLibrarySettingsTabContentContext.Provider value={setEditable}>
          <GeneralLibrarySettingsTabViewer library={library} />
          <GeneralLibrarySettingsTabEditor library={library} />
        </SetEditableGeneralLibrarySettingsTabContentContext.Provider>
      </EditableGeneralLibrarySettingsTabContentContext.Provider>
    )
  },
)
GeneralLibrarySettingsTab.displayName = 'GeneralLibrarySettingsTab'

const EditableGeneralLibrarySettingsTabContentContext = createContext<boolean>()
const SetEditableGeneralLibrarySettingsTabContentContext = createContext<Dispatch<SetStateAction<boolean>>>()

export function useEditableGeneralLibrarySettingsTabContent(): boolean {
  return useContext(EditableGeneralLibrarySettingsTabContentContext)
}

export function useSetEditableGeneralLibrarySettingsTabContent(): Dispatch<SetStateAction<boolean>> {
  return useContext(SetEditableGeneralLibrarySettingsTabContentContext)
}
