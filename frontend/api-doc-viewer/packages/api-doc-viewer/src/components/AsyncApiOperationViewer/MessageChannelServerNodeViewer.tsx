import { AsyncApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases"
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind"
import { FC, memo, useMemo } from "react"

import { isBindingsNode } from "@apihub/utils/async-api/node-type-checkers"
import { DescriptionRow } from "../common/annotations/Description/DescriptionRow"
import { DescriptionFontSize } from "../common/annotations/Description/types/DescriptionFontSize"
import { Aligner } from "../JsoViewer/Aligner"
import { BindingsNodeViewer } from "./BindingsNodeViewer"
import { BrokenRefViewer } from "./BrokenRefViewer"
import './styles/MessageChannelServer.css'
import { TitleRow } from "./TitleRow"
import { SizeVariant } from "./types/SizeVariant"

type MessageChannelServerNodeViewerProps = {
  node: AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.SERVER>
}

export const MessageChannelServerNodeViewer: FC<MessageChannelServerNodeViewerProps> = memo(props => {
  const { node } = props

  const value = useMemo(() => node.value(), [node])
  const meta = useMemo(() => node.meta(), [node])

  const brokenRef = useMemo(() => meta?.brokenRef, [meta])

  const description = useMemo(() => value?.description ?? value?.summary ?? '', [value])

  const children: AsyncApiTreeNode[] = node.childrenNodes()
  const bindingsChild = children.find(isBindingsNode)

  return (
    <div className='flex flex-col gap-2 message-channel-server-node'>
      {brokenRef && <BrokenRefViewer value={brokenRef} />}
      {!brokenRef && value && <>
        {value.title && (
          <TitleRow
            value={value.title}
            expandable={false}
            expanded={true}
            variant='h4'
          />
        )}
        <span className='server-element server-subheader'>
          {value.protocol}://{value.host}
        </span>
        <Aligner>
          <DescriptionRow
            value={description}
            fontSize={DescriptionFontSize.TERTIARY}
          />
        </Aligner>
      </>}
      {!brokenRef && children.length > 0 && bindingsChild && (
        <div className="flex flex-col gap-2">
          <BindingsNodeViewer
            node={bindingsChild}
            variant={SizeVariant.SECONDARY}
          />
        </div>
      )}
    </div>
  )
})
