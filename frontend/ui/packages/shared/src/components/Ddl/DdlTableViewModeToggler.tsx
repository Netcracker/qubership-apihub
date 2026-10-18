import { type FC, memo } from 'react'

import { DOC_SPEC_VIEW_MODE, RAW_SPEC_VIEW_MODE, SIMPLE_SPEC_VIEW_MODE, type SpecViewMode } from '../SpecViewToggler'
import { Toggler } from '../Toggler'

export const DDL_TABLE_VIEW_MODES: ReadonlyArray<SpecViewMode> = [
  DOC_SPEC_VIEW_MODE,
  SIMPLE_SPEC_VIEW_MODE,
  RAW_SPEC_VIEW_MODE,
]

export type DdlTableViewModeTogglerProps = {
  mode: SpecViewMode
  onChange: (mode: SpecViewMode) => void
}

export const DdlTableViewModeToggler: FC<DdlTableViewModeTogglerProps> = memo<DdlTableViewModeTogglerProps>(({
  mode,
  onChange,
}) => (
  <Toggler<SpecViewMode>
    mode={mode}
    modes={[...DDL_TABLE_VIEW_MODES]}
    onChange={onChange}
  />
))

DdlTableViewModeToggler.displayName = 'DdlTableViewModeToggler'
