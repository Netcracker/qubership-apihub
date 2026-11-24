import type { FC } from 'react'
import { memo } from 'react'

import type {
  SpecificationDialogDetail,
} from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/SpecificationDialog'
import {
  SHOW_SPECIFICATION_DIALOG,
  SpecificationPopup,
} from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/SpecificationDialog'
import { useSpecViewer } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/useSpecViewer'
import type { PortalSpecificationDialogDetail } from '../../../EventBusProvider'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { SpecViewMode } from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import {
  DOC_SPEC_VIEW_MODE,
  INTROSPECTION_SPEC_VIEW_MODE,
  SCHEMA_SPEC_VIEW_MODE,
} from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import { GRAPHQL_SPEC_TYPES } from '@netcracker/qubership-apihub-ui-shared/utils/specs'

export const PortalSpecificationDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_SPECIFICATION_DIALOG}
      render={props => <PortalSpecificationPopup {...props}/>}
    />
  )
})

export const PORTAL_GRAPHQL_VIEW_MODES: SpecViewMode[] = [SCHEMA_SPEC_VIEW_MODE, INTROSPECTION_SPEC_VIEW_MODE]

const PortalSpecificationPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const { spec, value } = detail as PortalSpecificationDialogDetail

  const isGraphQLSpec = GRAPHQL_SPEC_TYPES.includes(spec?.type)
  const {
    viewer,
    viewModes,
    viewMode,
    setViewMode,
  } = useSpecViewer({
    spec: spec,
    value: value,
    defaultViewMode: isGraphQLSpec ? SCHEMA_SPEC_VIEW_MODE : DOC_SPEC_VIEW_MODE,
  })

  const specificationPopupDetail: SpecificationDialogDetail = {
    spec: spec,
    viewer: viewer,
    viewModes: isGraphQLSpec ? PORTAL_GRAPHQL_VIEW_MODES : viewModes,
    viewMode: viewMode,
    setViewMode: setViewMode,
  }

  return (
    <SpecificationPopup
      open={open}
      setOpen={setOpen}
      detail={specificationPopupDetail}
    />
  )
})
