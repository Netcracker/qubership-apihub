import { cn } from "@apihub/utils/common/cn"
import { OpenApiBlockEdges } from "@netcracker/qubership-apihub-next-data-model/model/openapi/layout"
import { OpenApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/aliases"
import { OpenApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/node-kind"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { buildCollapsibleSectionElements } from "./CollapsibleSection"
import { CollapsibleExtensionsTitleRow, ExtensionsTitleRow, ExtensionsValues } from "./OpenApiExtensionsNodeViewer"
import { StackBlock, StackLayout } from "../shared-components/Layout/StackLayout"
import { OpenApiViewState } from "./OpenApiViewStateContext"

type ExtensionsNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.EXTENSIONS>

type OpenApiExtensionsNodeViewerProps = {
  node: ExtensionsNode
  variant: TextValueVariant
  testId: string
}

/**
 * An Extensions section as a layout block: its title row and its JSO viewer, two elements. Given the
 * view state it is a collapsible 2nd-level section (response, Responses Object extensions); the
 * operation's own (h2) Extensions are not collapsible.
 */
export function buildExtensionsBlock(id: string, props: OpenApiExtensionsNodeViewerProps, collapsibleIn?: OpenApiViewState): StackBlock {
  const { node, variant, testId } = props
  const title: StackBlock = {
    id: 'title',
    ...OpenApiBlockEdges.single(OpenApiBlockEdges.sectionTitleRow(node)),
    payload: () => collapsibleIn
      ? <CollapsibleExtensionsTitleRow key="title" node={node} variant={variant} />
      : <ExtensionsTitleRow key="title" node={node} variant={variant} />,
  }
  const values: StackBlock = {
    id: 'values',
    ...OpenApiBlockEdges.single(OpenApiBlockEdges.nested(node)),
    payload: () => <ExtensionsValues key="values" node={node} />,
  }
  const elements: [StackBlock, ...StackBlock[]] = collapsibleIn
    ? buildCollapsibleSectionElements(title, [values], collapsibleIn, node.id)
    : [title, values]
  return {
    id,
    ...OpenApiBlockEdges.container(elements),
    payload: () => (
      <div key={id} data-testid={testId} className={cn("flex flex-col")}>
        <StackLayout blocks={elements} level="section" />
      </div>
    ),
  }
}
