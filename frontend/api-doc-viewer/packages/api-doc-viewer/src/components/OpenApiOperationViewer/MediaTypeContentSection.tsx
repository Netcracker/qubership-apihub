import { cn } from "@apihub/utils/common/cn"
import { RequiredMark } from "../shared-components/RequiredMark/RequiredMark"
import { OpenApiDisplayLabels } from "@netcracker/qubership-apihub-next-data-model/model/openapi/display/labels"
import { useDiffMetaKeys } from "@apihub/contexts/DiffMetaKeysContext"
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { ChangedPropertyMetaData, NodeDiffsSeverities } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { OpenApiBlockEdges, OpenApiBodyElement, OpenApiBodyElements } from "@netcracker/qubership-apihub-next-data-model/model/openapi/layout"
import { OpenApiMediaTypeSchema } from "@netcracker/qubership-apihub-next-data-model/model/openapi/media-type-schema"
import { OpenApiRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/openapi/tree-with-diffs/row-diffs"
import { OpenApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/aliases"
import { OpenApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/node-kind"
import { isOpenApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/shared/openapi/guards/tree-node"
import { FC, Fragment, ReactElement, useMemo } from "react"
import { TagsWithDiffs } from "../shared-components/diffs/TagsWithDiffs"
import { Selector, SelectorOption } from "../shared-components/Selector/Selector"
import { SelectorVariant } from "../shared-components/Selector/types"
import { TextValue } from "../shared-components/TextValue/TextValue"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { PrecededBy } from "../shared-components/WithPrecededByProps"
import { indentSectionContent, useOpenApiSectionTitleRowProps } from "./CollapsibleSection"
import { StackBlock, StackLayout } from "../shared-components/Layout/StackLayout"
import { OpenApiSchemaViewer } from "./OpenApiSchemaViewer"
import { OptionKeyText } from "./OptionKeyText"

export type MediaTypeNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.MEDIA_TYPE>


type MediaTypeContentSectionProps = {
  testId: string
  /** Prefix of the option test ids (`request-media-type` / `response-media-type`): bodies can share media types. */
  optionTestIdPrefix: string
  mediaTypes: readonly MediaTypeNode[]
  /** Selected media-type node id; `undefined` = the first option. */
  selectedId: string | undefined
  onSelect: (mediaTypeNodeId: string) => void
  headerDiff?: ChangedPropertyMetaData
  diffsSeverities?: NodeDiffsSeverities
  /** Request body only: the side-exclusive `*` after the title. */
  isRequiredOnSide?: (layoutSide: LayoutSide) => boolean
  /** Request body only: the `required` tag of a required change. */
  requiredTagDiff?: ChangedPropertyMetaData
  /**
   * The Body's elements, decided by the block builder (next-data-model `OpenApiBlockEdges.bodyElements`:
   * title, description?, schema? of the selected media type; collapsed = title). Rendered as given.
   */
  elements: OpenApiBodyElements
  /** Request body only: the description row, rendered for the `description` element (the builder adds that element only with one). */
  renderDescription?: () => ReactElement
  /** Node id the section's collapsed state is kept under (view state); expanded by default. */
  sectionNodeId: string
}

/**
 * "Body" (h3) with the expander and the media-type selector in its title row, then - while expanded -
 * the optional description and the selected media type's schema wrapped under a `Type` root, each an
 * element of its own layout. Request body and response body share it. Which elements exist is decided
 * once by the block builder (`elements`, whose outer edges the parent level plans with
 * `OpenApiBlockEdges.body`); this component only renders them. Design: entities/request-body.md,
 * entities/responses.md -> "Body", features/collapsible-sections.md.
 */
export const MediaTypeContentSection: FC<MediaTypeContentSectionProps> = (props) => {
  const {
    testId, optionTestIdPrefix, mediaTypes, selectedId, onSelect, headerDiff, diffsSeverities,
    isRequiredOnSide, requiredTagDiff, elements, renderDescription, sectionNodeId,
  } = props
  const layoutMode = useLayoutMode()
  const diffMetaKeys = useDiffMetaKeys()
  const sectionProps = useOpenApiSectionTitleRowProps(sectionNodeId)

  const options: SelectorOption<MediaTypeNode>[] = useMemo(() => mediaTypes.map(mediaType => ({
    node: mediaType,
    title: (side: LayoutSide) => (
      <OptionKeyText
        text={OpenApiRowDiffs.MediaType.resolveSideTitle(mediaType, side)}
        highlight={OpenApiRowDiffs.MediaType.resolveSideTitleHighlight(mediaType, side)}
      />
    ),
    testId: `${optionTestIdPrefix}-${String(mediaType.key)}`,
    // Markers show inner changes only: an added / removed / renamed option is shown by its border
    // shadow / highlighted title and the yellow Body row.
    ...(isOpenApiTreeNodeWithDiffs(mediaType)
      ? { diffs: mediaType.diffs, descendantDiffsSummary: OpenApiRowDiffs.MediaType.takeChangesMarkerSummary(mediaType) }
      : {}),
  })), [mediaTypes, optionTestIdPrefix])
  const selectedOption = options.find(option => option.node.id === selectedId) ?? options[0] ?? null

  // The schema element's media type (the selected one); wrapped under `Type`, with its diff record in
  // diffs mode: prepared by next-data-model.
  const schemaMediaType = elements.find(isSchemaElement)?.mediaType
  const schema = useMemo(
    () => schemaMediaType ? OpenApiMediaTypeSchema.wrap(schemaMediaType, layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE ? diffMetaKeys?.diffsMetaKey : undefined) : undefined,
    [schemaMediaType, layoutMode, diffMetaKeys],
  )

  const renderTitle = (layoutSide: LayoutSide): ReactElement => (
    <div className={cn("flex flex-row items-baseline")}>
      <TextValue value={OpenApiDisplayLabels.BODY_TITLE} variant={TextValueVariant.h3} layoutSide={layoutSide} diff={headerDiff} onClick={sectionProps.onClickExpander} />
      {isRequiredOnSide?.(layoutSide) && <RequiredMark />}
    </div>
  )

  const renderSubheader = (layoutSide: LayoutSide): ReactElement => (
    <div className={cn("flex flex-row flex-wrap items-center gap-2")}>
      <Selector
        options={options}
        selectedOption={selectedOption}
        onSelectOption={(option) => onSelect(option.node.id)}
        variant={SelectorVariant.Secondary}
        layoutSide={layoutSide}
      />
      {/* After every media-type option (design: request-body.md -> header row). */}
      {requiredTagDiff && (
        <TagsWithDiffs
          requiredChanged={true}
          requiredDiff={requiredTagDiff}
          readOnly={false}
          writeOnly={false}
          layoutSide={layoutSide}
        />
      )}
    </div>
  )

  const renderElement = (element: OpenApiBodyElement): StackBlock[] => {
    switch (element.id) {
      case 'title':
        return [{
          id: element.id,
          ...OpenApiBlockEdges.single(element.edge),
          payload: () => (
            <TitleRow
              key="title"
              data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
              value={OpenApiDisplayLabels.BODY_TITLE}
              titleContent={renderTitle}
              variant={TextValueVariant.h3}
              {...sectionProps}
              subheader={renderSubheader}
              diff={headerDiff}
              diffsSeverities={diffsSeverities}
            />
          ),
        }]
      case 'description':
        return [indentSectionContent({ id: element.id, ...OpenApiBlockEdges.single(element.edge), payload: () => <Fragment key="description">{renderDescription?.()}</Fragment> })]
      case 'schema':
        return [indentSectionContent({ id: element.id, ...OpenApiBlockEdges.single(element.edge), payload: () => <OpenApiSchemaViewer key="schema" schema={schema} /> })]
    }
  }
  const blocks = elements.flatMap(renderElement)

  return (
    <div data-testid={testId} className={cn("flex flex-col")}>
      <StackLayout blocks={blocks} level="section" />
    </div>
  )
}

function isSchemaElement(element: OpenApiBodyElement): element is Extract<OpenApiBodyElement, { id: 'schema' }> {
  return element.id === 'schema'
}
