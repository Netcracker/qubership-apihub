import type { FC } from 'react'

import {
  DOC_SPEC_VIEW_MODE,
  RAW_SPEC_VIEW_MODE,
  type SpecViewMode,
} from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import { Toggler } from '@netcracker/qubership-apihub-ui-shared/components/Toggler'

const JAVA_CLASS_VIEW_MODES: ReadonlyArray<SpecViewMode> = [DOC_SPEC_VIEW_MODE, RAW_SPEC_VIEW_MODE]

type JavaClassViewModeTogglerProps = {
  mode: SpecViewMode
  onChange: (mode: SpecViewMode) => void
}

export const JavaClassViewModeToggler: FC<JavaClassViewModeTogglerProps> = ({ mode, onChange }) => (
  <Toggler<SpecViewMode>
    mode={mode === RAW_SPEC_VIEW_MODE ? RAW_SPEC_VIEW_MODE : DOC_SPEC_VIEW_MODE}
    modes={JAVA_CLASS_VIEW_MODES}
    onChange={onChange}
  />
)
JavaClassViewModeToggler.displayName = 'JavaClassViewModeToggler'
