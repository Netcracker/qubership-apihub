import { isBindingsNode, isExtensionsNode } from "@apihub/utils/async-api/node-type-checkers"
import { AsyncApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases"
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind"
import { FC } from "react"
import { DescriptionRow } from "../common/annotations/Description/DescriptionRow"
import { DescriptionFontSize } from "../common/annotations/Description/types/DescriptionFontSize"
import { Aligner } from "../JsoViewer/Aligner"
import { BindingsNodeViewer } from "./BindingsNodeViewer"
import { ExtensionsNodeViewer } from "./ExtensionsNodeViewer"
import { TitleRow } from "./TitleRow"

type MessageOperationNodeViewerProps = {
  node: AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION>
}

export const MessageOperationNodeViewer: FC<MessageOperationNodeViewerProps> = (props) => {
  const { node } = props

  const value = node.value()
  const title = value?.title ?? node.key.toString() ?? ''
  const description = value?.description ?? value?.summary ?? ''

  const children: AsyncApiTreeNode[] = node.childrenNodes()
  const bindingsChild = children.find(isBindingsNode)
  const extensionsChild = children.find(isExtensionsNode)

  return (
    <div className="flex flex-col gap-2">
      <TitleRow
        value={title}
        variant="h2"
        expandable={false}
        expanded={true}
      />
      {description && (
        <Aligner>
          <DescriptionRow
            value={description}
            fontSize={DescriptionFontSize.SECONDARY}
          />
        </Aligner>
      )}

      {children.length > 0 && (
        <div className="flex flex-col gap-2">
          {extensionsChild && <ExtensionsNodeViewer node={extensionsChild} />}
          {bindingsChild && <BindingsNodeViewer node={bindingsChild} />}
        </div>
      )}
    </div>
  )
}
