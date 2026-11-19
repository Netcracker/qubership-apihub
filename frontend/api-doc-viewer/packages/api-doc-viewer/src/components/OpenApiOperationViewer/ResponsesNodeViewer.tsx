import { cn } from "@apihub/utils/common/cn"
import { OpenApiDisplayLabels } from "@netcracker/qubership-apihub-next-data-model/model/openapi/display/labels"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { getOpenApiOptions, isOpenApiResponseNode } from "@apihub/utils/openapi/node-type-checkers"
import { resolveResponseCodeToneClass } from "@apihub/utils/openapi/response-code-tone"
import { OpenApiViewSelection } from "@apihub/utils/openapi/view-selection"
import { OpenApiRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/openapi/tree-with-diffs/row-diffs"
import { OpenApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/aliases"
import { OpenApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/node-kind"
import { isOpenApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/shared/openapi/guards/tree-node"
import { FC, useMemo } from "react"
import { ArrowScrollStrip } from "../shared-components/ArrowScrollStrip/ArrowScrollStrip"
import { Selector, SelectorOption } from "../shared-components/Selector/Selector"
import { SelectorVariant } from "../shared-components/Selector/types"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { PrecededBy } from "../shared-components/WithPrecededByProps"
import { takeOpenApiSeverities } from "./diff-state"
import { StackBlock, StackLayout } from "../shared-components/Layout/StackLayout"
import { OptionKeyText } from "./OptionKeyText"
import { useOpenApiViewState } from "./OpenApiViewStateContext"


export type ResponsesNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.RESPONSES>
type ResponseNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.RESPONSE>

type ResponsesNodeViewerProps = {
  /** Its elements (title row, sections), built by `buildResponsesBlock` (the parent needs them for the section's own edges). */
  blocks: readonly StackBlock[]
}

/**
 * "Responses" (h2) with the toned response-code selector in its subheader, the selected response's
 * sections, and the Responses Object extensions - in config order. Layout block: `responses-blocks.tsx`.
 */
export const ResponsesNodeViewer: FC<ResponsesNodeViewerProps> = ({ blocks }) => (
  <div data-testid="openapi-responses-section" className={cn("flex flex-col")}>
    <StackLayout blocks={blocks} level="responses" />
  </div>
)

type ResponsesTitleRowProps = {
  node: ResponsesNode
}

/**
 * "Responses" (h2) with the code selector: one line of codes in the shared `ArrowScrollStrip`, which
 * takes the rest of the row. The selection lives in the operation view state.
 */
export const ResponsesTitleRow: FC<ResponsesTitleRowProps> = ({ node }) => {
  const { selection, select } = useOpenApiViewState()
  const responses = useMemo(() => getOpenApiOptions(node, isOpenApiResponseNode), [node])

  const options: SelectorOption<ResponseNode>[] = useMemo(() => responses.map(response => ({
    node: response,
    title: (side: LayoutSide) => (
      <OptionKeyText
        text={OpenApiRowDiffs.Response.resolveSideCode(response, side)}
        highlight={OpenApiRowDiffs.Response.resolveSideCodeHighlight(response, side)}
      />
    ),
    testId: `response-code-${String(response.key)}`,
    // A wholly added / removed code keeps the default look: only its green / red border shadow.
    toneClass: OpenApiRowDiffs.Response.keepsCodeTone(response) ? resolveResponseCodeToneClass(response.value()?.codeClass) : undefined,
    // Markers show inner changes only: no own-diff summary, the descendant summary of the accessor.
    ...(isOpenApiTreeNodeWithDiffs(response)
      ? { diffs: response.diffs, descendantDiffsSummary: OpenApiRowDiffs.Response.takeChangesMarkerSummary(response) }
      : {}),
  })), [responses])
  const selected = OpenApiViewSelection.response(node, selection)
  const selectedOption = options.find(option => option.node.id === selected?.id) ?? null

  return (
    <TitleRow
      data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
      value={OpenApiDisplayLabels.RESPONSES_TITLE}
      expandable={false}
      variant={TextValueVariant.h2}
      // No strip (no codes, no arrows) on the side where the Responses section does not exist.
      subheader={(layoutSide) => !OpenApiRowDiffs.NodeLevel.isPresentOnSide(node, layoutSide) ? <></> : (
        <ArrowScrollStrip testIdPrefix="response-codes" overhangVertically={true}>
          <Selector
            options={options}
            selectedOption={selectedOption}
            onSelectOption={(option) => select(node.id, option.node.id)}
            variant={SelectorVariant.Secondary}
            layoutSide={layoutSide}
            noWrap={true}
          />
        </ArrowScrollStrip>
      )}
      diff={OpenApiRowDiffs.Responses.takeTitleRowDiff(node)}
      diffsSeverities={takeOpenApiSeverities(node)}
    />
  )
}
