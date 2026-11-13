import { cn } from "@apihub/utils/common/cn"
import { OpenApiBlockEdges } from "@netcracker/qubership-apihub-next-data-model/model/openapi/layout"
import { buildCollapsibleSectionElements } from "./CollapsibleSection"
import { StackBlock, StackLayout } from "../shared-components/Layout/StackLayout"
import { OpenApiSchemaViewer } from "./OpenApiSchemaViewer"
import { OpenApiViewState } from "./OpenApiViewStateContext"
import { ParametersNode, ParametersTitleRow } from "./ParametersNodeViewer"

type ParametersNodeViewerProps = {
  node: ParametersNode
  title: string
  testId: string
}

/**
 * A parameter group / response Headers as a layout block: a collapsible section - its h3 title row
 * with the expander, then (expanded) the synthesized object schema (a nested viewer) when there is
 * one. Design: entities/parameters.md, features/collapsible-sections.md.
 */
export function buildParametersBlock(id: string, props: ParametersNodeViewerProps, view: OpenApiViewState): StackBlock {
  const { node, title, testId } = props
  const schema = node.value()?.schema
  const elements = buildCollapsibleSectionElements(
    { id: 'title', ...OpenApiBlockEdges.single(OpenApiBlockEdges.sectionTitleRow(node)), payload: () => <ParametersTitleRow key="title" node={node} title={title} /> },
    schema !== undefined
      ? [{ id: 'schema', ...OpenApiBlockEdges.single(OpenApiBlockEdges.nested(node)), payload: () => <OpenApiSchemaViewer key="schema" schema={schema} /> }]
      : [],
    view,
    node.id,
  )
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
