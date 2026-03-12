import { useDisplayMode } from "@apihub/contexts/DisplayModeContext";
import { AsyncApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind";
import { FC, useEffect, useMemo, useState } from "react";
import { Selector, SelectorOption } from "./Selector/Selector";
import { MessageSectionViewer } from "./MessageSectionViewer";
import { isMessageSectionNode } from "@apihub/utils/async-api/node-type-checkers";
import { SizeVariant } from "./types/SizeVariant";

type MessageSectionsViewerProps = {
  node: AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR>
}

export const MessageSectionsViewer: FC<MessageSectionsViewerProps> = (props) => {
  const { node } = props

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const displayMode = useDisplayMode()

  const [selectedSection, setSelectedSection] = useState<SelectorOption | null>(null)
  const sectionNodes: AsyncApiTreeNode[] = node.nestedNodes()
  const sectionSelectorOptions = useMemo(
    () => sectionNodes.map(node => ({
      node: node,
      title: getMessageSectionTitle(node),
      testId: getMessageSectionTestId(node)
    })),
    [sectionNodes]
  )

  useEffect(() => {
    if (sectionSelectorOptions.length > 0 && selectedSection === null) {
      setSelectedSection(sectionSelectorOptions[0])
    }
  }, [sectionSelectorOptions, selectedSection])

  return (
    <div className="flex flex-col gap-2">
      <Selector
        options={sectionSelectorOptions}
        selectedOption={selectedSection}
        onSelectOption={setSelectedSection}
        variant={SizeVariant.SECONDARY}
      />
      {selectedSection && isMessageSectionNode(selectedSection.node) && (
        <div data-testid={`${selectedSection.testId}-section`}>
          <MessageSectionViewer node={selectedSection.node} />
        </div>
      )}
    </div>
  )
}

function getMessageSectionTitle(node: AsyncApiTreeNode): string {
  switch (node.kind) {
    case AsyncApiTreeNodeKinds.MESSAGE_CONTENT:
      return 'Message'
    case AsyncApiTreeNodeKinds.MESSAGE_CHANNEL:
      return 'Channel'
    case AsyncApiTreeNodeKinds.MESSAGE_OPERATION:
      return 'Operation'
    default:
      return 'Unknown'
  }
}

function getMessageSectionTestId(node: AsyncApiTreeNode): string {
  switch (node.kind) {
    case AsyncApiTreeNodeKinds.MESSAGE_CONTENT:
      return 'message-content'
    case AsyncApiTreeNodeKinds.MESSAGE_CHANNEL:
      return 'message-channel'
    case AsyncApiTreeNodeKinds.MESSAGE_OPERATION:
      return 'message-operation'
    default:
      return 'unknown'
  }
}
