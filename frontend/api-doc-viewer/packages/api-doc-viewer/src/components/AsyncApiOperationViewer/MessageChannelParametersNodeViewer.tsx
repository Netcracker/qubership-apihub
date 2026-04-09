import { AsyncApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases"
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind"
import { FC } from "react"
import { JsoViewer } from "../JsoViewer/JsoViewer"
import { TitleRow, TitleVariant } from "./TitleRow"

type MessageChannelParametersNodeViewerProps = {
  node: AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS>
}

// TODO: Make it row-like component
export const MessageChannelParametersNodeViewer: FC<MessageChannelParametersNodeViewerProps> = (props) => {
  const { node } = props

  const value = node.value()
  const addressParameters = value?.rawValues ?? {}

  return <>
    <TitleRow
      value='Address Parameters'
      expandable={false}
      variant={TitleVariant.h3}
    />
    <JsoViewer
      source={addressParameters}
      initialLevel={1}
      supportJsonSchema={true}
    />
  </>
}