import type { FC } from 'react'
import { memo } from 'react'
import type { AgentSpecificationDialogDetail } from '../../../../EventBusProvider'
import { SHOW_SPECIFICATION_DIALOG } from '../../../../EventBusProvider'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { isGraphQlSpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { GraphQlSpecificationPopup } from './GraphQlSpecificationPopup'
import { CommonSpecificationPopup } from './CommonSpecificationPopup'

export const AgentSpecificationDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_SPECIFICATION_DIALOG}
      render={props => <AgentSpecificationPopup {...props}/>}
    />
  )
})
const AgentSpecificationPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const { spec, agentId, namespaceKey, service } = detail as AgentSpecificationDialogDetail

  if (isGraphQlSpecType(spec.type)) {
    return <GraphQlSpecificationPopup
      clickedSpec={spec}
      service={service!}
      open={open}
      setOpen={setOpen}
      agentId={agentId}
      namespaceKey={namespaceKey}
    />
  }

  return <CommonSpecificationPopup
    spec={spec}
    open={open}
    setOpen={setOpen}
    agentId={agentId}
    namespaceKey={namespaceKey}
  />
})
