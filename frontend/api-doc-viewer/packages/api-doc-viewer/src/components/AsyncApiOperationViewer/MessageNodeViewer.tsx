import { useLayoutMode } from "@apihub/contexts/LayoutModeContext";
import { isMessageSectionSelectorNode } from "@apihub/utils/async-api/node-type-checkers";
import { AsyncApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind";
import { FC, useMemo } from "react";
import { DescriptionRow } from "../common/annotations/Description/DescriptionRow";
import { DescriptionFontSize } from "../common/annotations/Description/types/DescriptionFontSize";
import { Aligner } from "../JsoViewer/Aligner";
import { AddressRow } from "./AddressRow";
import { MessageSectionsViewer } from "./MessageSectionsViewer";
import { TitleRow } from "./TitleRow";

type MessageNodeViewerProps = {
  node: AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE>
}

export const MessageNodeViewer: FC<MessageNodeViewerProps> = (props) => {
  const { node } = props

  const layoutMode = useLayoutMode()

  const value = node.value()
  const children = useMemo(() => node.childrenNodes(), [node])

  const title = value?.title ?? value?.internalTitle ?? node.key.toString() ?? '<No message title>'
  const description = value?.description ?? value?.summary ?? ''

  return (
    <div className="flex flex-col gap-2">
      <TitleRow
        value={title}
        expandable={false}
        variant='h1'
      />
      <AddressRow
        action={value?.action ?? ''}
        address={value?.address ?? ''}
      />
      {description && (
        <Aligner>
          <DescriptionRow
            value={description}
            fontSize={DescriptionFontSize.PRIMARY}
            layoutMode={layoutMode}
          />
        </Aligner>
      )}
      <MessageChildrenViewer
        children={children}
      />
    </div>
  )
}

type OperationChildrenViewerProps = {
  children: AsyncApiTreeNode[]
}

const MessageChildrenViewer: FC<OperationChildrenViewerProps> = (props) => {
  const { children } = props

  return (
    <div className="flex flex-col gap-5">
      {children.map(child => {
        if (isMessageSectionSelectorNode(child)) {
          return <MessageSectionsViewer key={child.key} node={child} />
        }
        return null
      })}
    </div>
  )
}
